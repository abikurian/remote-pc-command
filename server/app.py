import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import psutil

try:
    import GPUtil
except ImportError:
    GPUtil = None

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Prime psutil.cpu_percent so subsequent non-blocking calls return meaningful values
psutil.cpu_percent(interval=None)


def get_system_stats():
    """Collect hardware telemetry for CPU, RAM, and GPU.

    Returns:
        dict: System telemetry with cpu_percent, ram_percent, gpu_load_percent,
              and gpu_temp. Defaults GPU fields to 0 if unavailable or if an error occurs.
    """
    cpu_percent = psutil.cpu_percent(interval=None)
    ram_percent = psutil.virtual_memory().percent

    gpu_load_percent = 0.0
    gpu_temp = 0.0

    if GPUtil is not None:
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                primary_gpu = gpus[0]
                if primary_gpu.load is not None:
                    gpu_load_percent = round(primary_gpu.load * 100, 2)
                if primary_gpu.temperature is not None:
                    gpu_temp = float(primary_gpu.temperature)
        except Exception as exc:
            logger.warning("Failed to retrieve GPU statistics: %s", exc)

    return {
        "cpu_percent": cpu_percent,
        "ram_percent": ram_percent,
        "gpu_load_percent": gpu_load_percent,
        "gpu_temp": gpu_temp,
    }


def emit_system_metrics():
    """Background task continuously emitting system metrics every 2 seconds."""
    while True:
        stats = get_system_stats()
        socketio.emit("system_metrics", stats)
        socketio.sleep(2)


background_task_started = False


@socketio.on("connect")
def handle_connect():
    global background_task_started
    if not background_task_started:
        socketio.start_background_task(emit_system_metrics)
        background_task_started = True


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"})


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
