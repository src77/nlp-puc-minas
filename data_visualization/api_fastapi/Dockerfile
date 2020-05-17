FROM src2000/python-slim:1.0.5
COPY . /app
WORKDIR /app/src
ENTRYPOINT ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload-dir", "/app"]
