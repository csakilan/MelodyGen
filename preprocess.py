# load midi files from Mono-Melodies-All/Flute
# music21.converter.parse(filename) can be used
# to convert a midi file to a music21 stream
import os 
import music21
import music21.instrument

# load files from all given folders

folders_to_load = ["./Mono-Melodies-All/Flute"]

streams = []

file_limit = 5
file_count = 0

# file reading loop

for folder in folders_to_load:
    for path in os.listdir(folder):
        if file_count >= file_limit:
            break
        streams.append(music21.instrument.partitionByInstrument(music21.converter.parse(folder + "/" + path, format="midi")))
        print("Reading " + path)
        file_count += 1

# isolate the flute part
pitches = []
for stream in streams:
    print("Looking at", stream)
    for part in stream.parts:
        if part.partName is not None and "Flute" in part.partName:
            print(part.partName)
            myPitches = []
            shouldSkip = False
            for note in part.notes:
                # if it's a chord, skip the part
                if note is not music21.note.Note:
                    shouldSkip = True
                    break
                myPitches.append(note.pitch)
            if shouldSkip:
                continue
            pitches.extend(myPitches)
        # for n in stream.notesAndRests:
        #     print(n.pitch.name)


# i want a list of notes in the following format:
# [(pitch number, duration in beats), (pitch number)...]
# pitch number is the midi number of the pitch
# eg: C3 is 60, C4 is 72, C5 is 84
pitches = [ pitch.mini for pitch in pitches ]