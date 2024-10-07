# load midi files from Mono-Melodies-All/Flute
# music21.converter.parse(filename) can be used
# to convert a midi file to a music21 stream
import os 
# import music21
from music21 import *
from music21.analysis.discrete import DiscreteAnalysisException
import music21.instrument
from fractions import Fraction
import time

# load files from all given folders
read_all_files = False
folders_to_load = ["Mono-Melodies-All/Flute","Mono-Melodies-All/Clarinet","Mono-Melodies-All/Choir Aahs", "Mono-Melodies-All/Alto Sax", "Mono-Melodies-All/Acoustic Guitar", "Mono-Melodies-All/Acoustic Grand Piano"] if read_all_files else ["Mono-Melodies-All/Alto Sax"]

files = []

file_limit = -1 if read_all_files else 5
file_count = 0
note_count = 0
display_output = False
display_file_output = True

TOLERANCE = .00001
PROGRESS_CHARACTERS = 30

startTime = time.time()

# clear line for printing
if display_file_output:
    print(" " * 100)

# file reading loop
for folder in folders_to_load:
    for path in os.listdir(folder):
        if file_limit >= 0 and file_count >= file_limit:
            break
        files.append(folder + "/" + path)
        file_count += 1
        if display_file_output:
            print(f"\033[F\33[2K\rReading {path} ({file_count} files)")


def durationToString(duration: float | Fraction) -> str:
    if isinstance(duration, Fraction):
        duration = float(duration.numerator) / duration.denominator
    return f"{duration:.2f}"

# clear line for printing
if display_file_output:
    print(" " * 100)

output_file = open("out/melodyDataRunning.txt", "w")
output_file.write("[")

# isolate the flute part
# or any single melody
melodyData: list[list[(int, float)]] = []
for file_index in range(file_count):
    file = files[file_index]
    if display_file_output:
        progress = (file_index + 1) / file_count * 100
        progress_int = int(round(progress / (100 / PROGRESS_CHARACTERS)))
        last_slash = file.rfind("/")
        print(f"\033[F\33[2K\r[{"#" * progress_int}{"-" * (PROGRESS_CHARACTERS - progress_int)}] {progress:.1f}% - {file[:last_slash] + "/" + file[last_slash + 1:last_slash+7] + "..."} ({len(melodyData)} melodies, {note_count} notes)")
    try:
        stream = music21.instrument.partitionByInstrument(music21.converter.parse(file, format="midi"))

        '''
        midiFile = converter.parse(file)
        keySignature = midiFile.analyze('key')
        print("key signature: ", keySignature)

        parts = midiFile.parts
        if parts:
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
        else:
            print("no parts found")
        '''

        for part in stream.parts:
            if part.partName is not None:
                # TODO: confirm the part is in 4/4 
                # if not, skip the part
                # apparently time signature is None for all
                notes: list[music21.note.Note | music21.note.Rest] = []

                shouldSkip = False
                
                '''
                notes_and_chords = part.flatten().getElementsByClass(['Note', 'Chord'])
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
                '''

                # Use a set to remove duplicates
                key_signatures = { str(key) for key in part.flatten().getElementsByClass('KeySignature') }

                if len(key_signatures) > 1:
                    if display_output:
                        print("Multiple key signatures found in this part:")
                        for ks in key_signatures:
                            print(f"Key: {ks}")
                    shouldSkip = True
                    break
                elif len(key_signatures) == 1:
                    key_signatures = list(key_signatures)
                    if display_output:
                        print(f"Single key signature: {key_signatures[0]}")
                else:
                    if display_output:
                        print("No explicit key signature found. Likely inferred.")


                # Fix the melody, then add it to melodyData
                
                # TODO: find a way to find the key signature of a given part
                # TODO: subtract the highest root node above the lowest note in a melody

                def cleanUpMelody():
                    global notes, note_count
                    
                    # Do not try to add a melody if there are no notes
                    if len(notes) <= 16:
                        return
                    
                    for n in range(len(notes) - 1):
                        # cut overlapping notes short
                        if((notes[n].offset + notes[n].duration.quarterLength) > notes[n+1].offset):
                            notes[n].duration.quarterLength = notes[n+1].offset - notes[n].offset
                        
                    melody = []
                    hasNote = False
                    for note in notes:
                        durationStr = durationToString(note.duration.quarterLength)
                        if durationStr == "0.00":
                            continue
                        if isinstance(note, music21.note.Rest):
                            melody.append((0, durationStr))
                        else:
                            melody.append((note.pitch.midi, durationStr))
                            hasNote = True
                    
                    # Do not add melodies that do not contain notes (only contains rests)
                    if not hasNote:
                        return
                    
                    # remove high octave pitches 
                    integers = [note[0] for note in melody if note[0] != 0]
                    min_pitch = min(integers)
                    max_pitch = max(integers)
                    pitch_range = max_pitch - min_pitch

                    # remove melodies with a range greater than 36
                    if(pitch_range > 36):
                        return
                    
                    # normalize the pitches based on min root pitch
                    counts = [0] * 12
                    for pitch in integers:
                        counts[pitch % 12] += 1
                    # get root note [0, 12) based on most common 1st and 5th notes
                    root = 0
                    maxCount = 0
                    for i in range(12):
                        myCount = counts[i] * 2 + counts[(i + 5) % 12] + counts[(i + 7) % 12]
                        if myCount > maxCount:
                            root = i
                            maxCount = myCount
                    # offset is largest root that is <= min_pitch
                    offset = min_pitch % 12 - root
                    offset = offset if offset <= 0 else offset - 12
                    if display_output:
                        print(counts, root)
                    melody = [(note[0] - (min_pitch + offset) + 60, note[1]) if note[0] != 0 else note for note in melody]
                    
                    if (len(melodyData) > 0):
                        output_file.write(", ")
                    note_count += len(melody)
                    output_file.write(str(melody))
                    melodyData.append(melody)
                    if display_output:
                        print("Added melody of", len(melody), "notes from", part.partName)
                    notes = []
                
                for note in part.notesAndRests:
                    # remove melodies that contain notes with odd fractions
                    dur = (note.duration.quarterLength).as_integer_ratio()
                    if (not(4 % dur[1] == 0) and (not(dur[1] == 3))):
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
    except Exception as e:
        if display_file_output:
            print(f"Error reading {file}: {e}\n")
 
"""
# i want a list of notes in the following format:
# [(pitch number, duration in beats), (pitch number)...]
# pitch number is the midi number of the pitch
# eg: C3 is 60, C4 is 72, C5 is 84

noteDict = {}
noteDictLen = 0

def one_hot_encode(note: tuple[int, float], noteDict: dict): 
    if note not in noteDict:
        noteDict[note] = noteDictLen
        noteDictLen += 1
    return noteDict[note]

one_hot_encode()"""

# output the note data to a file
with open("out/melodyData.txt", "w") as file:
    file.write(str(melodyData))
output_file.write("]")
output_file.close()

print("Wrote to file successfully!")
print(f"Finished running in {time.time() - startTime:.3f} seconds")
