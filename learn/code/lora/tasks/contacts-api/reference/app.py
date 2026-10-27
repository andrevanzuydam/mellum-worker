from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

import migrations
import models

BASE = Path(__file__).parent
templates = Jinja2Templates(directory=str(BASE / "templates"))

app = FastAPI()
APP_NAME = "Rolodex"


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


@app.get("/contacts", response_class=HTMLResponse)
def contacts(request: Request):
    return templates.TemplateResponse(
        request,
        "contacts.html",
        {"app_name": APP_NAME, "contacts": models.list_contacts(_db())},
    )


@app.post("/contacts")
def create_contact(name: str = Form(...), email: str = Form(...)):
    models.add_contact(_db(), name, email)
    return RedirectResponse("/contacts", status_code=303)


@app.post("/contacts/{contact_id}/star")
def star(contact_id: int):
    models.set_starred(_db(), contact_id, True)
    return RedirectResponse("/contacts", status_code=303)


@app.post("/contacts/{contact_id}/unstar")
def unstar(contact_id: int):
    models.set_starred(_db(), contact_id, False)
    return RedirectResponse("/contacts", status_code=303)


@app.get("/summary")
def summary():
    return JSONResponse(models.summary(_db()))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", reload=True)
