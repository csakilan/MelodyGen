from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np

app = Flask(__name__)

# Load the model
with open('out/encodings.txt', 'r') as file:
    encodings = eval(file.read())

# decoder constructed by reversing one-hot encoding
decodings = {}
for k, v in encodings.items():
    decodings[v] = k

model = tf.keras.models.Sequential([
    tf.keras.layers.Masking(mask_value=0, batch_input_shape=(1, None, len(encodings))),
    tf.keras.layers.LSTM(64, stateful=True, return_sequences=True),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(len(encodings), activation='softmax')
])

optimizer = tf.keras.optimizers.Adam(learning_rate=.002)
model.compile(optimizer=optimizer, loss='categorical_crossentropy', metrics=['accuracy'])
model.load_weights("checkpoints/model_full_v1.h5")


@app.route('/predict', methods=['POST'])
def predict():
    # Receive data from the front end
    # fetch("http://127.0.0.1:5000/predict", {method:"POST", headers: {"Content-Type": "application/json" }, body: JSON.stringify({notes: [ [1, "1.00"], [3, '1.00'], [5, '1.00'], [6, '1.00'] ]})}).then(res => res.json()).then(console.log)
    # Seems to prefer ('C', 'C'), probably since it's the most common
    data = request.json
    print(data)
    # Convert newNotes to model input format
    newNotes = [encodings[tuple(note)] for note in data["notes"]]
    X = []
    for encoding in newNotes:
        one_hot = np.zeros(len(encodings))
        one_hot[encoding] = 1
        X.append(one_hot)
    
    model.reset_states()
    Y = []
    for note in X:
        Y.append(model.predict_on_batch(note.reshape(1, 1, len(encodings))))
    response = {
        "notes": [decodings[np.argmax(y)] for y in Y[-1:]]
    }
    print([decodings[np.argmax(y)] for y in Y])
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
