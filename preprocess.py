# load midi files from Mono-Melodies-All/Flute
# music21.converter.parse(filename) can be used
# to convert a midi file to a music21 stream
import os 
import music21
import music21.instrument

# load files from all given folders

folders_to_load = ["./Mono-Melodies-All/Flute"]

files = []

file_limit = 5
file_count = 0

# file reading loop

for folder in folders_to_load:
    for path in os.listdir(folder):
        if file_count >= file_limit:
            break
        files.append(folder + "/" + path)
        print("Reading " + path)
        file_count += 1

# isolate the flute part
# or any single melody
notes: list[list[music21.note.Note]] = []
for file in files:
    print("Looking at", file)
    stream = music21.instrument.partitionByInstrument(music21.converter.parse(file, format="midi"))
    for part in stream.parts:
        if part.partName is not None and ("Flute" in part.partName or True):
            myNotes = []
            shouldSkip = False
            for note in part.notes:
                # if it's a chord, skip the part
                if not isinstance(note, music21.note.Note):
                    shouldSkip = True
                    break
                myNotes.append(note)
            if shouldSkip or len(myNotes) == 0:
                continue
            print(part.partName, "is good:", len(myNotes), "notes")
            notes.append(myNotes)


# i want a list of notes in the following format:
# [(pitch number, duration in beats), (pitch number)...]
# pitch number is the midi number of the pitch
# eg: C3 is 60, C4 is 72, C5 is 84
noteData: list[list[(int, float)]] = []
for songNotes in notes:
    noteData.append([(note.pitch.midi, note.duration.quarterLength) for note in songNotes])

# output the note data to a file
with open("out/noteData.txt", "w") as file:
    file.write(str(noteData))

print("Wrote to file successfully!")