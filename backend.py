from flask import Flask, request, jsonify
from celery import Celery
import os
from dotenv import load_dotenv
import datetime
import requests
import logging

# Load environment variables
load_dotenv()

# Flask app initialization
app = Flask(__name__)

# Celery configuration (make sure Redis is running)
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# Firebase API details from .env
@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        "FCM_SERVER_KEY": os.getenv("FCM_SERVER_KEY"),
        "FIREBASE_API_KEY": os.getenv("FIREBASE_API_KEY"),
        "FIREBASE_AUTH_DOMAIN": os.getenv("FIREBASE_AUTH_DOMAIN"),
        "FIREBASE_PROJECT_ID": os.getenv("FIREBASE_PROJECT_ID"),
        "FIREBASE_STORAGE_BUCKET": os.getenv("FIREBASE_STORAGE_BUCKET"),
        "FIREBASE_MESSAGING_SENDER_ID": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
        "FIREBASE_APP_ID": os.getenv("FIREBASE_APP_ID")
    })

FCM_API_URL = os.getenv('FCM_API_URL')
FIREBASE_SERVER_KEY = os.getenv('FIREBASE_SERVER_KEY')

# Set up logging
logging.basicConfig(level=logging.INFO)

# Celery task to send notifications
@celery.task
def send_fcm_notification(uid, time_scheduled, title, body):
    try:
        headers = {
            "Authorization": f"Bearer {FIREBASE_SERVER_KEY}",
            "Content-Type": "application/json",
        }

        # Notification payload
        payload = {
    "message": {
        "token": f"{uid}",  # Replace with the target browser/device token
        "notification": {
            "title": title,
            "body": body,
            "icon": "https://your-website.com/images/notification-icon.png",
            "badge": "https://your-website.com/images/notification-badge.png"
        },
        "webpush": {
            "headers": {
                "TTL": "3600"
            },
            "fcm_options": {
                "link": "https://your-website.com"
            },
            "notification": {
                "actions": [
                    {
                        "action": "view_details",
                        "title": "View Details"
                    },
                    {
                        "action": "dismiss",
                        "title": "Dismiss"
                    }
                ]
            }
        }
    }
}


        # Make API request to FCM
        response = requests.post(FCM_API_URL, json=payload, headers=headers)
        if response.status_code == 200:
            logging.info(f"Notification sent to UID {uid} for time {time_scheduled}")
        else:
            logging.error(f"FCM error: {response.text}")

    except Exception as e:
        logging.error(f"Error sending notification to UID {uid}: {e}")


@app.route('/user-login', methods=['POST'])
def user_login():
    data = request.json
    uid = data.get('uid')

    if not uid:
        return jsonify({"error": "UID is required"}), 400

    # Log or process as needed when a user logs in.
    logging.info(f"User logged in with UID: {uid}")

    return jsonify({"status": "User logged in", "uid": uid}), 200


@app.route('/set-reminder', methods=['POST'])
def set_reminder():
    try:
        data = request.json
        if not data or 'uid' not in data or 'times' not in data:
            return jsonify({"error": "Invalid data"}), 400

        uid = data['uid']
        times = data['times']  # List of ISO 8601 time strings (e.g., '2024-11-26T15:30:00')

        title = data.get('title', "Reminder")  # Notification title (optional)
        body = data.get('body', "This is your scheduled reminder.")  # Notification body (optional)

        # Parse times and schedule notifications
        for time_str in times:
            try:
                scheduled_time = datetime.datetime.fromisoformat(time_str)
                time_diff = (scheduled_time - datetime.datetime.now()).total_seconds()
                if time_diff > 0:
                    send_fcm_notification.apply_async(
                        args=[uid, time_str, title, body],
                        countdown=time_diff
                    )
                    logging.info(f"Notification scheduled for UID {uid} at {scheduled_time}")
                else:
                    logging.warning(f"Time {time_str} is in the past. Skipping.")
            except ValueError:
                logging.error(f"Invalid time format: {time_str}")
                return jsonify({"error": f"Invalid time format: {time_str}"}), 400

        return jsonify({"status": "Reminders set", "uid": uid, "times": times}), 200

    except Exception as e:
        logging.error(f"Error in set_reminder: {e}")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=True)
