# load midi files from Mono-Melodies-All/Flute
# music21.converter.parse(filename) can be used
# to convert a midi file to a music21 stream
import os 
# import music21
from music21 import *
from music21.analysis.discrete import DiscreteAnalysisException
import music21.instrument


# load files from all given folders

folders_to_load = ["Mono-Melodies-All/Flute","Mono-Melodies-All/Clarinet","Mono-Melodies-All/Choir Aahs", "Mono-Melodies-All/Alto Sax", "Mono-Melodies-All/Acoustic Guitar", "Mono-Melodies-All/Acoustic Grand Piano"]


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
        if part.partName is not None: # and ("Flute" in part.partName or True):            
            # TODO: confirm the part is in 4/4 
            # if not, skip the part
            notes: list[music21.note.Note | music21.note.Rest] = []
            notes_and_chords = part.flat.getElementsByClass(['Note', 'Chord'])

            if part.partName is not None and ("Flute" in part.partName or True):
                shouldSkip = False
                
                # #Start of Find Key signature of specific part
                # if len(notes_and_chords) > 0:
                #     try:
                #         # Try to analyze the key
                #         key_signature = notes_and_chords.analyze('key')
                #         print(f"Key Signature: {key_signature}")
                #     except DiscreteAnalysisException as e:
                #         # Handle the specific DiscreteAnalysisException
                #         print(f"Failed to analyze key signature: {str(e)}")
                #     except Exception as e:
                #         # Handle any other exceptions
                #         print(f"An error occurred: {str(e)}")
                # else:
                #     print("No notes or chords found in this part of the MIDI file.")

                # Use a set to remove duplicates
                key_signatures = set([str(key) for key in part.flat.getElementsByClass('KeySignature')])

                if len(key_signatures) > 1:
                        print("Multiple key signatures found in this part:")
                        for ks in key_signatures:
                            print(f"Key: {ks}")
                        shouldSkip = True
                        break
                elif len(key_signatures) == 1:
                    key_signatures = list(key_signatures)
                    print(f"Single key signature: {key_signatures[0]}")
                else:
                    print("No explicit key signature found. Likely inferred.")


                # Fix the melody, then add it to melodyData
                
                # TODO: find a way to find the key signature of a given part
                # TODO: subtract the highest root node above the lowest note in a melody

                def cleanUpMelody():
                    global notes

                    
                    
                    # Do not try to add a melody if there are no notes
                    if len(notes) <= 16:
                        return
                    
                    for n in range(len(notes) - 1):
                        # cut overlapping notes short
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

    #remove high octave pitches 
 
# print(noteData)

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


#remove high octave pitches 

for melody in melodyData:
    integers = [note[0] for note in melody]
    integers = [num for num in integers if num != 0]
    min_pitch = min(integers)
    max_pitch = max(integers)
    pitch_range = max_pitch - min_pitch

    #remove melodies with a range greater than 36
    if(pitch_range > 36):
        melodyData.remove(melody)


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
