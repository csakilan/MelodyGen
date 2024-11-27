from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
import copy

app = Flask(__name__)

# Load the model
with open('encodings.txt', 'r') as file:
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

model.load_weights("checkpoints/model_full_v3.h5")
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

#initialize the model
#need init to recieve the prepended information from the front end for a token 
@app.route('/init', methods=['POST'])
def init():
    # Receive data from the front end
    # fetch("http://

    data = request.json
    model.reset_states()
    #train on a single token tuple that could be either (major, 4/4) or (minor, 4/4)

    print(data)
    token = tuple(data["notes"])
    
    X = []
    one_hot = np.zeros(len(encodings))
    one_hot[encodings[token]] = 1
    X.append(one_hot)

    output = model.predict_on_batch(X[0].reshape(1, 1, len(encodings)))

    return jsonify({"notes": [decodings[np.argmax(output)]], "token": token})

#waiting for a post request in editor.tsx
@app.route('/predict', methods=['POST']) # source is predict, goes to this file
def predict():
    # Receive data from the front end
    # fetch("http://127.0.0.1:5000/predict", {method:"POST", headers: {"Content-Type": "application/json" }, body: JSON.stringify({notes: [ [1, "1.00"], [3, '1.00'], [5, '1.00'], [6, '1.00'] ]})}).then(res => res.json()).then(console.log)
    # Seems to prefer ('C', 'C'), probably since it's the most common

    # notes fed from the front end
    data = request.json
    # print(data)
    # Convert newNotes to model input format
    userNotes = [encodings[tuple(note)] for note in data["notes"]]
    encodedUserNotes = []
    generatedNotes = []


    for encoding in userNotes:
        one_hot = np.zeros(len(encodings))
        one_hot[encoding] = 1
        encodedUserNotes.append(one_hot)
    
    # feed generated notes into X
    # beats per measure can be retrieved from the token
    for note in encodedUserNotes:
        model.predict_on_batch(note.reshape(1, 1, len(encodings)))
    generatedNotes = generate_melodies(num_melodies=3, measures=4, beats_per_measure=4)
    
    '''# Generate new notes
    for i in range(20):
        model.reset_states()
        Y = []
        for note in X:
            Y.append(model.predict_on_batch(note.reshape(1, 1, len(encodings))))
        one_hot = np.zeros(len(encodings))
        one_hot[np.argmax(Y[-1])] = 1
        X.append(one_hot)
        addedNotes.append(decodings[np.argmax(Y[-1])])'''

    response = {
        "notes": generatedNotes
    }

    # print([decodings[np.argmax(y)] for y in Y])
    
    return jsonify(response)

def generate_melodies(num_melodies=3, measures=4, beats_per_measure=4):
    global model  # Use the global model variable
    beats_per_melody = measures * beats_per_measure
    forbidden_first_notes = set()
    
    original_states = copy.deepcopy(model.get_weights())

    generated_melodies = []

    melody_num = 0

    while melody_num < num_melodies:

        while True:
            one_hot = np.zeros(len(encodings))
            one_hot[1] = 1  

            pred = model.predict_on_batch(np.array([[one_hot]]))[0][0]

            if len(pred) != len(encodings):
                raise ValueError(f"Prediction size mismatch: {len(pred)} vs {len(encodings)}")

            first_note_index = np.random.choice(len(pred), p=pred)
            first_note = decodings[first_note_index]

            if first_note not in forbidden_first_notes and validNote(first_note) and first_note[0] != 'C':
                break

            model.set_weights(original_states)

        generated_notes = [first_note]
        previous_note_index = first_note_index

        beats = float(first_note[1])

        #for _ in range(1, beats_per_melody):
        while beats < beats_per_melody:
            one_hot = np.zeros(len(encodings))
            one_hot[previous_note_index] = 1
            
            pred = model.predict_on_batch(np.array([[one_hot]]))[0][0]

            if len(pred) != len(encodings):
                raise ValueError(f"Prediction size mismatch: {len(pred)} vs {len(encodings)}")

            next_index = np.random.choice(len(pred), p=pred)
            generated_note = decodings[next_index]
            generated_notes.append(generated_note)
            previous_note_index = next_index

            if generated_note[0] == 'C':
                beats += 1
            else:
                beats += float(generated_note[1])

        
        # TODO: if the length of notes is wrong or a single note is invalid, repeat the whole process and don't add it

        model.set_weights(original_states)

        # add it if it's valid
        if beats == beats_per_melody and all(validNote(note) for note in generated_notes):
            melody_output = []
            for measure in range(measures):
                measure_notes = generated_notes[measure * beats_per_melody: (measure + 1) * beats_per_melody]
                melody_output.extend(measure_notes)
            
            generated_melodies.append(melody_output)

            # add the first note to the forbidden list
            forbidden_first_notes.add(first_note)

            # if successful set this
            melody_num += 1
            print(f"Generating Melody {melody_num}:")
            print("-" * 30)
            print (generated_melodies[-1])

    return generated_melodies

def validNote(note):
    # ('minor', '4/4')
    if note[0] == 'minor' or note[0] == 'major':
        return False
    return True

if __name__ == '__main__':
    app.run(debug=True)
