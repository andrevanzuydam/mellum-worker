from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

import migrations
import models

BASE = Path(__file__).parent
templates = Jinja2Templates(directory=str(BASE / "templates"))

app = FastAPI()
APP_NAME = "Slots"


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


@app.get("/bookings", response_class=HTMLResponse)
def bookings(request: Request):
    return templates.TemplateResponse(
        request,
        "bookings.html",
        {"app_name": APP_NAME, "bookings": models.list_bookings(_db())},
    )


@app.post("/bookings")
def create_booking(who: str = Form(...), when_at: str = Form(...)):
    models.add_booking(_db(), who, when_at)
    return RedirectResponse("/bookings", status_code=303)


@app.post("/bookings/{booking_id}/confirm")
def confirm(booking_id: int):
    models.set_confirmed(_db(), booking_id, True)
    return RedirectResponse("/bookings", status_code=303)


@app.post("/bookings/{booking_id}/cancel")
def cancel(booking_id: int):
    models.set_confirmed(_db(), booking_id, False)
    return RedirectResponse("/bookings", status_code=303)


@app.get("/summary")
def summary():
    return JSONResponse(models.summary(_db()))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", reload=True)
