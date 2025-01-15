FROM python:3.10-slim
LABEL org.opencontainers.image.source="https://github.com/MasterGeonum/cartondes"

WORKDIR /app

COPY python_api /app
RUN pip3 install -r requirements.txt

EXPOSE 1234

ENTRYPOINT ["python", "app.py"]