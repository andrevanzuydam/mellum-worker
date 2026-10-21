import sqlite3

import uvicorn
from fastapi import FastAPI, Form, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

import models
from models import Complaint, complaints

app = FastAPI()
templates = Jinja2Templates(directory="templates")


def set_status(complaint_id: int, status: str, action: str) -> RedirectResponse:
    for complaint in complaints:
        if complaint.id == complaint_id:
            complaint.status = status
            models.record(complaint_id, action)
            return RedirectResponse("/complaints", status_code=303)
    raise HTTPException(status_code=404, detail="Complaint not found")


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(request, "home.html")


@app.get("/complaints")
def board(request: Request):
    visible = [c for c in complaints if c.status != "archived"]
    return templates.TemplateResponse(
        request, "complaints.html", {"complaints": visible}
    )


@app.post("/complaints")
def add_complaint(agent_name: str = Form(), text: str = Form()):
    complaints.append(Complaint(agent_name, text))
    return RedirectResponse("/complaints", status_code=303)


@app.post("/complaints/{complaint_id}/resolve")
def resolve(complaint_id: int):
    return set_status(complaint_id, "resolved", "resolve")


@app.post("/complaints/{complaint_id}/reopen")
def reopen(complaint_id: int):
    return set_status(complaint_id, "open", "reopen")


@app.post("/complaints/{complaint_id}/archive")
def archive(complaint_id: int):
    for complaint in complaints:
        if complaint.id == complaint_id:
            if complaint.status != "resolved":
                raise HTTPException(status_code=400, detail="Only resolved complaints can be archived")
            complaint.status = "archived"
            models.record(complaint_id, "archive")
            return RedirectResponse("/complaints", status_code=303)
    raise HTTPException(status_code=404, detail="Complaint not found")


@app.get("/stats")
def stats():
    return {"open": sum(1 for c in complaints if c.status == "open")}


@app.get("/report")
def report():
    con = sqlite3.connect("data.db")
    try:
        open_total = con.execute(
            "select coalesce(sum(cents), 0) from tickets "
            "where archived_at is null and status = 'open'").fetchone()[0]
        archived_total = con.execute(
            "select coalesce(sum(cents), 0) from tickets "
            "where archived_at is not null").fetchone()[0]
        all_time = con.execute("select coalesce(sum(cents), 0) from tickets").fetchone()[0]
    finally:
        con.close()
    return {
        "open_total_cents": int(open_total),
        "archived_total_cents": int(archived_total),
        "all_time_total_cents": int(all_time),
    }


@app.get("/visits")
def visits(
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    min_minutes: int = 0,
    limit: int = 10,
):
    con = sqlite3.connect("data.db")
    try:
        rows = con.execute(
            "select agent, count(*), sum(minutes), avg(minutes) from visits "
            "where date >= ? and date <= ? and minutes >= ? group by agent",
            (from_, to, min_minutes),
        ).fetchall()
    finally:
        con.close()
    data = [
        {"agent": agent, "count": int(count), "total_minutes": int(total),
         "average_minutes": float(average)}
        for agent, count, total, average in rows
    ]
    data.sort(key=lambda row: (-row["total_minutes"], row["agent"]))
    return {"visits": data[:limit]}


if __name__ == "__main__":
    uvicorn.run("app:app", reload=True)
