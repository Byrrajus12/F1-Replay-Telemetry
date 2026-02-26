import json
from pathlib import Path
from typing import Optional
import fastf1
import numpy as np


def get_qualifying_lap_data(year: int, round_num: int, driver_code: str = "VER") -> dict:
    print(f"Fetching {year} Round {round_num} qualifying data for {driver_code}...")
    
    try:
        # Load the session
        session = fastf1.get_session(year, round_num, "Q")
        session.load(telemetry=True, weather=False)
        
        # Get the fastest lap for this driver in qualifying
        driver_laps = session.laps.pick_driver(driver_code)
        if driver_laps.empty:
            raise ValueError(f"No laps found for driver {driver_code}")
        
        fastest_lap = driver_laps.pick_fastest()
        if fastest_lap is None:
            raise ValueError(f"No fastest lap found for driver {driver_code}")
        
        print(f"Found lap: {fastest_lap['LapTime']}")
        
        # Get telemetry
        telemetry = fastest_lap.get_telemetry()
        
        if telemetry.empty:
            raise ValueError("No telemetry data available for this lap")
        
        print(f"Telemetry points: {len(telemetry)}")
        
        # Get session info
        track_name = session.event["Location"]
        circuit_length = session.event.get("Circuit Length") or 5891  # Default for Silverstone
        
        # Convert telemetry to our format
        telemetry_points = []
        
        for idx, row in telemetry.iterrows():
            # Convert X, Y from raw to 1/10 meter units (multiply by 10)
            # FastF1 provides X, Y in meters with ~0.1m precision
            x = float(row["X"]) * 10 if not np.isnan(row["X"]) else 0
            y = float(row["Y"]) * 10 if not np.isnan(row["Y"]) else 0
            z = float(row.get("Z", 0)) * 10 if "Z" in row and not np.isnan(row.get("Z", 0)) else 0
            
            # Time in seconds from start of telemetry
            if hasattr(row.name, 'total_seconds'):
                t = row.name.total_seconds()
            else:
                t = float(idx) * 0.1  # Approximate 10Hz sampling
            
            # Speed in km/h
            s = float(row.get("Speed", 0)) if not np.isnan(row.get("Speed", 0)) else 0
            
            # RPM
            rpm = int(row.get("RPM", 0)) if not np.isnan(row.get("RPM", 0)) else 0
            
            # Gear
            g = int(row.get("nGear", 0)) if not np.isnan(row.get("nGear", 0)) else 0
            
            # Throttle
            th = float(row.get("Throttle", 0)) if not np.isnan(row.get("Throttle", 0)) else 0
            
            # Brake (boolean)
            br = bool(row.get("Brake", False)) if "Brake" in row else False
            
            # DRS (map 0/1 to 0/12)
            drs_raw = row.get("DRS", 0)
            if np.isnan(drs_raw):
                drs = 0
            else:
                drs = 12 if drs_raw == 1 else 0
            
            # Distance along track (meters)
            d = float(row.get("Distance", 0)) if not np.isnan(row.get("Distance", 0)) else 0
            
            telemetry_points.append({
                "t": round(t, 2),
                "d": round(d, 1),
                "x": round(x, 1),
                "y": round(y, 1),
                "z": round(z, 1) if z != 0 else None,
                "s": round(s, 1),
                "rpm": rpm,
                "g": g,
                "th": round(th, 1),
                "br": br,
                "drs": drs
            })
        
        # Get lap time
        lap_time = fastest_lap.get("LapTime")
        lap_time_str = str(lap_time).split(".")[0]  # Format as M:SS.SSS
        
        # Build response
        result = {
            "metadata": {
                "source": "FastF1 Live Data",
                "track": track_name,
                "trackLength": int(circuit_length),
                "year": year,
                "session": "Q",
                "driver": driver_code,
                "lapTime": lap_time_str,
                "samplingRate": f"~{1000 / len(telemetry_points) * len(telemetry):.0f}ms",
                "coordinateUnit": "1/10 meter (divide by 10 for meters)"
            },
            "telemetry": telemetry_points
        }
        
        return result
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        raise


def get_race_data(year: int, round_num: int, lap_limit: int = 3) -> dict:
    """
    Fetch race session data for ALL drivers with synchronized telemetry.
    
    Args:
        year: Season year
        round_num: Race round number
        lap_limit: Number of laps to fetch (to avoid huge datasets)
    
    Returns:
        Dictionary with race data for all drivers synchronized by time
    """
    print(f"Fetching {year} Round {round_num} race data...")
    
    try:
        # Load the race session
        session = fastf1.get_session(year, round_num, "R")
        session.load(telemetry=True, weather=False, laps=True)
        
        # Get session info
        track_name = session.event["Location"]
        
        # Get all drivers
        drivers = session.drivers
        print(f"Found {len(drivers)} drivers in the race")
        
        # Collect telemetry for all drivers (first N laps)
        drivers_data = {}
        
        for driver_num in drivers:
            try:
                driver_code = session.get_driver(driver_num)["Abbreviation"]
                print(f"Processing driver {driver_code}...")
                
                # Get laps for this driver
                driver_laps = session.laps.pick_driver(driver_num)
                if driver_laps.empty:
                    continue
                
                # Pick first N laps
                laps_to_process = driver_laps.iloc[:lap_limit]
                
                # Collect telemetry from all these laps
                all_telemetry = []
                for lap_idx, lap in laps_to_process.iterrows():
                    telemetry = lap.get_telemetry()
                    if not telemetry.empty:
                        all_telemetry.append(telemetry)
                
                if not all_telemetry:
                    continue
                
                # Concatenate all telemetry
                import pandas as pd
                combined_telemetry = pd.concat(all_telemetry, ignore_index=False)
                
                # Store driver data
                telemetry_points = []
                for idx, row in combined_telemetry.iterrows():
                    x = float(row["X"]) * 10 if not np.isnan(row["X"]) else 0
                    y = float(row["Y"]) * 10 if not np.isnan(row["Y"]) else 0
                    
                    # Time from session start
                    if hasattr(row.name, 'total_seconds'):
                        t = row.name.total_seconds()
                    else:
                        t = float(len(telemetry_points)) * 0.1
                    
                    s = float(row.get("Speed", 0)) if not np.isnan(row.get("Speed", 0)) else 0
                    d = float(row.get("Distance", 0)) if not np.isnan(row.get("Distance", 0)) else 0
                    
                    telemetry_points.append({
                        "t": round(t, 2),
                        "x": round(x, 1),
                        "y": round(y, 1),
                        "s": round(s, 1),
                        "d": round(d, 1)
                    })
                
                # Get team info
                team_name = session.get_driver(driver_num).get("TeamName", "Unknown")
                
                drivers_data[driver_code] = {
                    "driver": driver_code,
                    "team": team_name,
                    "telemetry": telemetry_points
                }
                
            except Exception as e:
                print(f"Error processing driver {driver_num}: {e}")
                continue
        
        # Build response
        result = {
            "metadata": {
                "source": "FastF1 Race Data",
                "track": track_name,
                "year": year,
                "round": round_num,
                "session": "Race",
                "laps": lap_limit,
                "drivers": len(drivers_data),
                "coordinateUnit": "1/10 meter (divide by 10 for meters)"
            },
            "drivers": drivers_data
        }
        
        return result
        
    except Exception as e:
        print(f"Error fetching race data: {e}")
        raise


def fetch_and_save_silverstone(output_path: Optional[str] = None) -> dict:
    """
    Fetch Silverstone 2024 Q3 qualifying data and optionally save to JSON
    
    Args:
        output_path: Path to save JSON file (if None, only returns dict)
    
    Returns:
        Dictionary with telemetry data
    """
    # Silverstone 2024 is round 10
    data = get_qualifying_lap_data(2024, 10, "VER")
    
    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Data saved to {output_path}")
    
    return data


def fetch_and_save_race(year: int, round_num: int, lap_limit: int = 3, output_path: Optional[str] = None) -> dict:
    """
    Fetch race data for all drivers and optionally save to JSON
    
    Args:
        year: Season year
        round_num: Race round number
        lap_limit: Number of laps to fetch per driver
        output_path: Path to save JSON file (if None, only returns dict)
    
    Returns:
        Dictionary with race data for all drivers
    """
    data = get_race_data(year, round_num, lap_limit)
    
    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Race data saved to {output_path}")
    
    return data
