# load midi files from Mono-Melodies-All/Flute
# music21.converter.parse(filename) can be used
# to convert a midi file to a music21 stream
import os 
# import music21
from music21 import *
from music21.analysis.discrete import DiscreteAnalysisException
import music21.instrument


# load files from all given folders

folders_to_load = ["Mono-Melodies-All/Flute"]

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
noteData: list[list[(int, float)]] = []
for file in files:
    print("Looking at", file)
    stream = music21.instrument.partitionByInstrument(music21.converter.parse(file, format="midi"))

    notes: list[(int, float, float)] = []

    midiFile = converter.parse(file)
    # keySignature = midiFile.analyze('key')
    # print("key signature: ", keySignature)

    parts = midiFile.parts
    # if parts:
    #     if len(notes_and_chords) > 0:
    #         try:
    #             # Try to analyze the key
    #             key_signature = notes_and_chords.analyze('key')
    #             print(f"Key Signature: {key_signature}")
    #         except DiscreteAnalysisException as e:
    #             # Handle the specific DiscreteAnalysisException
    #             print(f"Failed to analyze key signature: {str(e)}")
    #         except Exception as e:
    #             # Handle any other exceptions
    #             print(f"An error occurred: {str(e)}")
    #     else:
    #         print("No notes or chords found in this part of the MIDI file.")
    # else:
    #     print("no parts found")

    for part in stream.parts:
        notes_and_chords = part.flat.getElementsByClass(['Note', 'Chord'])
        





        #Start of Find Key signature of specific part




        if len(notes_and_chords) > 0:
            try:
                # Try to analyze the key
                key_signature = notes_and_chords.analyze('key')
                print(f"Key Signature: {key_signature}")
            except DiscreteAnalysisException as e:
                # Handle the specific DiscreteAnalysisException
                print(f"Failed to analyze key signature: {str(e)}")
            except Exception as e:
                # Handle any other exceptions
                print(f"An error occurred: {str(e)}")
        else:
            print("No notes or chords found in this part of the MIDI file.")
        key_signatures = part.flat.getElementsByClass('KeySignature')


        print("inside main keySignature Area")
        if len(key_signatures) > 1:
                print("Multiple key signatures found in this part:")
                #when this code runs, sometimes returns two of the same key signature
                #need to remove these parts from everything
                for ks in key_signatures:
                    print(f"Key: {ks}, Measure: {ks.measureNumber}")
        elif len(key_signatures) == 1:
            print(f"Single key signature: {key_signatures[0]}")
        else:
            print("No explicit key signature found. Likely inferred.")












        #End of key signature code

        if part.partName is not None and ("Flute" in part.partName or True):
            myNotes = []
            shouldSkip = False
            for note in part.notesAndRests:
                # if a chord is found, skip the entire part
                if not(isinstance(note, music21.note.Note) or isinstance(note, music21.note.Rest)):
                    shouldSkip = True
                    break
                myNotes.append(note)
                
                #record rests as '0'
                if isinstance(note, music21.note.Rest):
                    notes.append((0, note.duration.quarterLength))
                else:
                    notes.append((note.pitch.midi, note.duration.quarterLength))
                
            if shouldSkip or len(myNotes) == 0:
                continue

            #cut overlapping notes short
            for n in range(len(myNotes) - 1):
                if(  (myNotes[n].offset + myNotes[n].duration.quarterLength) > myNotes[n+1].offset):
                    myNotes[n].duration.quarterLength = myNotes[n+1].offset - myNotes[n].offset

            print(part.partName, "is good:", len(myNotes), "notes")

    noteData.append(notes)



    #remove high octave pitches 
 
    # print(noteData)
    integers = [note[0] for sublist in noteData for note in sublist]
    integers = [num for num in integers if num != 0]
    min_pitch = min(integers)
    max_pitch = max(integers)
    pitch_range = max_pitch - min_pitch

    print(pitch_range)




#Code to remove 3+ octaves


# maxVal = -100
# minVal = 2000
# for note in notes:
#     if len(note) > 0:  # Ensure the tuple has at least one element
#         if note[0]>maxVal:
#             maxVal = note[0]
#         if note[0]<minVal:
#             minVal = note[0]
#     else:
#         print("Tuple is empty or missing the integer part")
# print(maxVal, minVal)
    #remove 3+ octave files
    # print(notes[0])
    # minPitch = min(notes[0])
    # maxPitch = max(notes[0])
    # range = maxPitch-minPitch

    # if range>36:
    #     print("bigger")
    # else:
    #     print("smaller")








# i want a list of notes in the following format:
# [(pitch number, duration in beats), (pitch number)...]
# pitch number is the midi number of the pitch
# eg: C3 is 60, C4 is 72, C5 is 84


'''for songNotes in notes:
    if isinstance(note, music21.note.Rest):
        notes.append([(0, note.duration.quarterLength) for note in songNotes])
    else:
        notes.append([(note.pitch.midi, note.duration.quarterLength) for note in songNotes])'''

# output the note data to a file


# with open("out/noteData.txt", "w") as file:
#     file.write(str(noteData))

# print("Wrote to file successfully!")

