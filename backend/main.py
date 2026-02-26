from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from f1_data import get_qualifying_lap_data, fetch_and_save_barcelona, fetch_and_save_race
import json

app = FastAPI(title="F1 Replay Telemetry API", version="0.1.0")


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "F1 Replay Telemetry API is running"
    }


@app.get("/api/track/{year}/{round_num}/{session}")
async def get_track_data(year: int, round_num: int, session: str, driver: str = "VER"):
    try:
        if session.upper() != "Q":
            # For now, only support qualifying
            raise HTTPException(status_code=400, detail="Only qualifying sessions ('Q') are supported")
        
        data = get_qualifying_lap_data(year, round_num, driver)
        return JSONResponse(content=data)
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")


@app.get("/api/barcelona-2024")
async def get_barcelona_qualifying():
    try:
        data = fetch_and_save_barcelona()
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching barcelona data: {str(e)}")


@app.get("/api/save-barcelona")
async def save_bae_json():
    try:
        output_path = "../frontend/src/lib/fixtures/barcelonaQualifyingLap.json"
        data = fetch_and_save_barcelona(output_path)
        
        return {
            "status": "success",
            "message": f"barcelona 2024 qualifying data saved",
            "track": data["metadata"]["track"],
            "driver": data["metadata"]["driver"],
            "lapTime": data["metadata"]["lapTime"],
            "points": len(data["telemetry"]),
            "trackLength": data["metadata"]["trackLength"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving data: {str(e)}")


@app.get("/api/save-race/{year}/{round_num}")
async def save_race_json(year: int, round_num: int, laps: int = 3):
    try:
        output_path = "../frontend/src/lib/fixtures/raceData.json"
        data = fetch_and_save_race(year, round_num, laps, output_path)
        
        return {
            "status": "success",
            "message": f"Race data saved for {year} Round {round_num}",
            "track": data["metadata"]["track"],
            "drivers": data["metadata"]["drivers"],
            "laps": data["metadata"]["laps"],
            "year": year,
            "round": round_num
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving race data: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
