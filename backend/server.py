from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    newNotes = request.json  # Receive data from the front end
    print(newNotes)
    predictionFile = {
        "newtings" : [1,2,3,4,5]
    }
    # prediction = your_model_script.predict(data)  # Call your model’s prediction function
    return jsonify(predictionFile)

if __name__ == '__main__':
    app.run(debug=True)
