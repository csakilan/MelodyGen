from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    # for i in range(100000000):
    #     pass
    # Return hardcoded response for testing frontend
    response = {
        "notes": [
            [(1, "1.00"), (3, "1.00"), (5, "1.00"), (6, "1.00"), (5, "1.00")],
            [(1, "0.50"), ("C", "C"), (0, "0.50"), (5, "0.50"), ("C", "C")],
            [(13, "0.25"), (20, "0.25"), (13, "0.25"), (20, "0.25"), (13, "0.25"), (20, "0.25"), (13, "0.25"), (20, "0.25"), (15, "0.25"), (20, "0.25"), (15, "0.25"), (20, "0.25"), (15, "0.25"), (20, "0.25"), (15, "0.25"), (20, "0.25")],
        ]
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)