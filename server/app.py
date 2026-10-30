import logging
import os
import subprocess
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

# Resolve common user path dynamically
LOCALAPPDATA = os.environ.get("LOCALAPPDATA", "")
PROGRAMFILES = os.environ.get("ProgramFiles", "C:\\Program Files")
PROGRAMFILES_X86 = os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")

# Strict server-side app registry
APP_REGISTRY = {
    "vscode": {
        "name": "Visual Studio Code",
        "path": os.path.join(LOCALAPPDATA, "Programs", "Microsoft VS Code", "Code.exe"),
    },
    "emulator": {
        "name": "BlueStacks",
        "path": os.path.join(PROGRAMFILES, "BlueStacks_nxt", "HD-Player.exe"),
    },
    "rdr2": {
        "name": "Red Dead Redemption 2",
        # PLACEHOLDER: Update with your exact RDR2.exe path if different
        "path": "D:\\Games\\Red Dead Redemption 2\\RDR2.exe",
    },
}

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


@socketio.on("launch_app")
def handle_launch_app(data):
    """Handle secure application launch requests.

    Expects data format: {'appId': '<registered_id>'}
    Emits 'launch_status' with {'status': 'success' | 'error', 'appId': '<id>', 'message': '...'}.
    """
    if not isinstance(data, dict):
        socketio.emit(
            "launch_status",
            {"status": "error", "appId": None, "message": "Invalid request payload"},
        )
        return

    app_id = data.get("appId")
    if not app_id or app_id not in APP_REGISTRY:
        logger.warning("Unauthorized or unknown app launch requested: %s", app_id)
        socketio.emit(
            "launch_status",
            {
                "status": "error",
                "appId": app_id,
                "message": f"Application '{app_id}' is not in the registry.",
            },
        )
        return

    app_entry = APP_REGISTRY[app_id]
    target_path = app_entry["path"]
    app_name = app_entry.get("name", app_id)

    if not os.path.exists(target_path):
        logger.error("Target executable not found: %s", target_path)
        socketio.emit(
            "launch_status",
            {
                "status": "error",
                "appId": app_id,
                "message": f"Executable not found at {target_path}",
            },
        )
        return

    try:
        # Non-blocking execution without shell=True to prevent shell injection or blocking
        subprocess.Popen([target_path], shell=False)
        logger.info("Successfully launched %s (%s)", app_name, app_id)
        socketio.emit(
            "launch_status",
            {
                "status": "success",
                "appId": app_id,
                "name": app_name,
                "message": f"{app_name} Initialized",
            },
        )
    except Exception as exc:
        logger.exception("Failed to launch application %s: %s", app_id, exc)
        socketio.emit(
            "launch_status",
            {
                "status": "error",
                "appId": app_id,
                "message": f"Failed to launch: {str(exc)}",
            },
        )


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"})


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
