import uvicorn
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates

from models import complaints

app = FastAPI()
templates = Jinja2Templates(directory="templates")


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(request, "home.html")


@app.get("/complaints")
def board(request: Request):
    return templates.TemplateResponse(
        request, "complaints.html", {"complaints": complaints}
    )


if __name__ == "__main__":
    uvicorn.run("app:app", reload=True)
