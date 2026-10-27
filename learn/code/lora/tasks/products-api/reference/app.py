from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

import migrations
import models

BASE = Path(__file__).parent
templates = Jinja2Templates(directory=str(BASE / "templates"))

app = FastAPI()
APP_NAME = "Shopfront"


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


@app.get("/products", response_class=HTMLResponse)
def listing(request: Request):
    return templates.TemplateResponse(
        request, "list.html", {"app_name": APP_NAME, "rows": models.list_rows(_db())}
    )


@app.post("/products")
def create(name: str = Form(...), sku: str = Form(...)):
    models.add_row(_db(), name, sku)
    return RedirectResponse("/products", status_code=303)


@app.post("/products/{product_id}/feature")
def flag_on(product_id: int):
    models.set_flag(_db(), product_id, True)
    return RedirectResponse("/products", status_code=303)


@app.post("/products/{product_id}/unfeature")
def flag_off(product_id: int):
    models.set_flag(_db(), product_id, False)
    return RedirectResponse("/products", status_code=303)


@app.get("/summary")
def summary():
    return JSONResponse(models.summary(_db()))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", reload=True)
