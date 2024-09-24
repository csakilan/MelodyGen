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
display_output = False

TOLERANCE = .00001

# file reading loop

for folder in folders_to_load:
    for path in os.listdir(folder):
        if file_count >= file_limit:
            break
        files.append(folder + "/" + path)
        if display_output:
            print("Reading " + path)
        file_count += 1

# isolate the flute part
# or any single melody
melodyData: list[list[(int, float)]] = []
for file in files:
    if display_output:
        print("Looking at", file)
    stream = music21.instrument.partitionByInstrument(music21.converter.parse(file, format="midi"))

    #print("Key Signature")
    for part in stream.parts:
        if part.partName is not None: # and ("Flute" in part.partName or True):            
            # TODO: confirm the part is in 4/4 
            # if not, skip the part

            notes: list[music21.note.Note | music21.note.Rest] = []
            shouldSkip = False
            
            # Fix the melody, then add it to melodyData
            
            # TODO: find a way to find the key signature of a given part
            # TODO: subtract the highest root node above the lowest note in a melody

            def cleanUpMelody():
                global notes
                
                # Do not try to add a melody if there are no notes
                if len(notes) <= 16:
                    return
                # cut overlapping notes short
                for n in range(len(notes) - 1):
                    if((notes[n].offset + notes[n].duration.quarterLength) > notes[n+1].offset):
                        notes[n].duration.quarterLength = notes[n+1].offset - notes[n].offset
                melody = []
                for note in notes:
                    if isinstance(note, music21.note.Rest):
                        melody.append((0, note.duration.quarterLength))
                    else:
                        melody.append((note.pitch.midi, note.duration.quarterLength))
                melodyData.append(melody)
                if display_output:
                    print("Added melody of", len(melody), "notes from", part.partName)
                notes = []
            
            for note in part.notesAndRests:

                #remove melodies that contain notes with odd fractions
                dur = (note.duration.quarterLength).as_integer_ratio()

                if (not(note.duration.quarterLength % 0.25 == 0) and (not(dur[1] == 3))):
                    #print(note.duration.quarterLength)
                    shouldSkip = True
                    break
                
                # record rests as '0'
                if isinstance(note, music21.note.Rest):
                    # Try splitting the melody if whole rest
                    if abs(note.duration.quarterLength - 4.0) < TOLERANCE:
                        cleanUpMelody()
                    else:
                        notes.append(note)
                elif isinstance(note, music21.note.Note):
                    notes.append(note)
                else:
                    # if a chord is found, skip the entire part
                    shouldSkip = True
                    break
                
            if not shouldSkip:
                cleanUpMelody()


# i want a list of notes in the following format:
# [(pitch number, duration in beats), (pitch number)...]
# pitch number is the midi number of the pitch
# eg: C3 is 60, C4 is 72, C5 is 84

noteDict = {}
noteDictLen = 0

"""
def one_hot_encode(note: tuple[int, float], noteDict: dict): 
    if note not in noteDict:
        noteDict[note] = noteDictLen
        noteDictLen += 1
    return noteDict[note]

one_hot_encode()"""

# output the note data to a file
with open("out/melodyData.txt", "w") as file:
    file.write(str(melodyData))

print("Wrote to file successfully!")
