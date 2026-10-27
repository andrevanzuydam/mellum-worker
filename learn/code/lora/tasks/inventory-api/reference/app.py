from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

import migrations
import models

BASE = Path(__file__).parent
templates = Jinja2Templates(directory=str(BASE / "templates"))

app = FastAPI()
APP_NAME = "Stockroom"


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


@app.get("/items", response_class=HTMLResponse)
def items(request: Request):
    return templates.TemplateResponse(
        request, "items.html", {"app_name": APP_NAME, "items": models.list_items(_db())}
    )


@app.post("/items")
def create_item(name: str = Form(...), sku: str = Form(...), quantity: int = Form(...)):
    models.add_item(_db(), name, sku, quantity)
    return RedirectResponse("/items", status_code=303)


@app.post("/items/{item_id}/flag")
def flag(item_id: int):
    models.set_flagged(_db(), item_id, True)
    return RedirectResponse("/items", status_code=303)


@app.post("/items/{item_id}/unflag")
def unflag(item_id: int):
    models.set_flagged(_db(), item_id, False)
    return RedirectResponse("/items", status_code=303)


@app.get("/summary")
def summary():
    return JSONResponse(models.summary(_db()))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", reload=True)
