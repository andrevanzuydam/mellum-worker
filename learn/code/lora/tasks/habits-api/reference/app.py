from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

import migrations
import models

BASE = Path(__file__).parent
templates = Jinja2Templates(directory=str(BASE / "templates"))

app = FastAPI()
APP_NAME = "Streaks"


@app.on_event("startup")
def _startup() -> None:
    db = models.get_db()
    models.init_db(db)
    migrations.run_migrations(db)


def _db():
    return models.get_db()


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request, "home.html", {"app_name": APP_NAME})


@app.get("/habits", response_class=HTMLResponse)
def listing(request: Request):
    return templates.TemplateResponse(
        request, "list.html", {"app_name": APP_NAME, "rows": models.list_rows(_db())}
    )


@app.post("/habits")
def create(name: str = Form(...), cadence: str = Form(...)):
    models.add_row(_db(), name, cadence)
    return RedirectResponse("/habits", status_code=303)


@app.post("/habits/{habit_id}/track")
def flag_on(habit_id: int):
    models.set_flag(_db(), habit_id, True)
    return RedirectResponse("/habits", status_code=303)


@app.post("/habits/{habit_id}/untrack")
def flag_off(habit_id: int):
    models.set_flag(_db(), habit_id, False)
    return RedirectResponse("/habits", status_code=303)


@app.get("/summary")
def summary():
    return JSONResponse(models.summary(_db()))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", reload=True)
