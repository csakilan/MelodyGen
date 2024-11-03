# load midi files from Mono-Melodies-All/Flute
# music21.converter.parse(filename) can be used
# to convert a midi file to a music21 stream
import os 
# import music21
from music21 import *
import music21.instrument
from fractions import Fraction
import time
import traceback
import warnings

import music21.midi.translate

# load files from all given folders
read_all_files = False
include_triplets = True
folders_to_load = ["Mono-Melodies-All/Flute","Mono-Melodies-All/Clarinet","Mono-Melodies-All/Choir Aahs", "Mono-Melodies-All/Alto Sax", "Mono-Melodies-All/Acoustic Guitar", "Mono-Melodies-All/Acoustic Grand Piano"] if read_all_files else ["Mono-Melodies-All/Flute"]

files = []

file_limit = -1 if read_all_files else 10
file_count = 0
note_count = 0
display_output = False
display_file_output = True

valid_times = ["3/4", "4/4"]

TOLERANCE = .00001
PROGRESS_CHARACTERS = 30

startTime = time.time()

# file reading loop
for folder in folders_to_load:
    for path in os.listdir(folder):
        if file_limit >= 0 and file_count >= file_limit:
            break
        files.append(folder + "/" + path)
        file_count += 1
        if display_file_output:
            print(f"\33[2KFound {path} ({file_count} files)", end="\r")
print()


def durationToString(duration: float | Fraction) -> str:
    if isinstance(duration, Fraction):
        duration = float(duration.numerator) / duration.denominator
    return f"{duration:.2f}"

keys = []

# Hide "Unable to get instrument..." warning
warnings.filterwarnings("ignore", category=music21.midi.translate.TranslateWarning)

# isolate the flute part
# or any single melody
melodyData: list[list[(int, float)]] = []
for file_index in range(file_count):
    file = files[file_index]
    if display_file_output:
        progress = (file_index + 1) / file_count * 100
        progress_int = int(round(progress / (100 / PROGRESS_CHARACTERS)))
        last_slash = file.rfind("/")
        #print(f"\33[2K[{"#" * progress_int}{"-" * (PROGRESS_CHARACTERS - progress_int)}] {progress:.1f}% - {file[:last_slash] + "/" + file[last_slash + 1:last_slash+7] + "..."} ({len(melodyData)} melodies, {note_count} notes)", end="\r")
    try:
        stream = music21.instrument.partitionByInstrument(music21.converter.parse(file, format="midi"))
        key_signature: key.Key = stream.analyze("key")
        keys.append(str(key_signature))

        timeSigFound = False
        timeSig = ""


        for part in stream.parts:
            if part.partName is not None:
                notes: list[music21.note.Note | music21.note.Rest] = []
                shouldSkip = False

                # TIME SIGNATURE CHECK
                time_signature_it: music21.stream.iterator.RecursiveIterator = part[music21.meter.TimeSignature]
                if len(time_signature_it) == 0:
                    continue
                time_signature = time_signature_it[0]
                if not time_signature.ratioString in valid_times:
                    #print(f"Skipping {file} due to invalid time signature {time_signature.ratioString}")
                    continue

                timeSig = str(time_signature.ratioString)
                timeSigFound = True
                #print(time_signature.ratioString + str(key_signature))

                def cleanUpMelody():
                    global notes, note_count
                    
                    # Do not try to add a melody if there are no notes
                    if len(notes) <= 16:
                        return
                    
                    for n in range(len(notes) - 1):
                        # cut overlapping notes short
                        if((notes[n].offset + notes[n].duration.quarterLength) > notes[n+1].offset):
                            notes[n].duration.quarterLength = notes[n+1].offset - notes[n].offset
                            ratio = notes[n].duration.quarterLength.as_integer_ratio()
                            if not(4 % ratio[1] == 0 or (ratio[1] == 3 and include_triplets)):
                                return
                        
                    melody = []
                    hasNote = False


                    #go through notes and rests and add them to melody
                    for note in notes:
                        durationStr = durationToString(note.duration.quarterLength)
                            
                        if durationStr == "0.00":
                            continue
                        if isinstance(note, music21.note.Rest):
                            # Condense rests to be shorter than a measure
                            if len(melody) > 0 and melody[-1][0] == 0:
                                dur = (Fraction(durationStr) + Fraction(melody[-1][1])) % time_signature.numerator
                                if dur == 0:
                                    dur = time_signature.numerator
                                melody[-1] = (0, durationToString(dur))
                            else:
                                melody.append((0, durationStr))
                        else:
                            melody.append((note.pitch.midi, durationStr))
                            hasNote = True
                    
                    # Do not add melodies that do not contain notes (only contains rests)
                    # Also check if melody is too short after overlapping notes cut short to 0 were removed
                    if not hasNote or len(melody) <= 16:
                        return
                    
                    # remove high octave pitches 
                    integers = [note[0] for note in melody if note[0] != 0]
                    min_pitch = min(integers)
                    max_pitch = max(integers)
                    pitch_range = max_pitch - min_pitch

                    # remove melodies with a range greater than 36
                    if(pitch_range > 36):
                        return
                    
                    root = key_signature.tonic.midi % 12
                    # offset is largest root that is <= min_pitch
                    offset = min_pitch % 12 - root
                    offset = offset if offset <= 0 else offset - 12
                    melody = [(note[0] - (min_pitch + offset) + 1, note[1]) if note[0] != 0 else note for note in melody]

                    note_count += len(melody)
                    melodyData.append(melody)
                    if display_output:
                        print("Added melody of", len(melody), "notes from", part.partName)
                    notes = []
                
                for note in part.notesAndRests:
                    # remove melodies that contain notes with odd fractions
                    dur = (note.duration.quarterLength).as_integer_ratio()
                    if not(4 % dur[1] == 0 or (dur[1] == 3 and include_triplets)):
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

        if timeSigFound == True:
            # Ensure melodyData has enough elements
            while len(melodyData) <= file_index:
                melodyData.append([])

            

            # Add time signature and key signature to the beginning of the melody

            key_sig = key_signature.name[(len(key_signature.name)) - 5:]
            melodyData[file_index].insert(0, (key_sig, str(time_signature.ratioString)))



            
        #time_signature: meter.TimeSignature = stream.flat.getElementsByClass(meter.TimeSignature)[0]
        


    except midi.MidiException as e:
        print(f"Error reading {file}: {e}\n")
    except Exception as e:
        if display_file_output:
            traceback.print_exc()

# go through melodyData and if the note is being held out for more than 1 beat, then use 'C' to represent 1 beat that note is held out for

part = [('major', '3/4'), (11, '0.5'), (11, '1.00'), (11, '2.00'), (8, '1.00'), (8, '2.00')]


newPart = []
newMelodyData: list[list[(int, float)]] = []
i = 0

for i in range(len(melodyData)):
    part = melodyData[i]
    #current and next
    while i < len(part):
        j = 1
        currentPitch = part[i][0]

        #append current part to newPart
        newPart.append(part[i])

        #check if out of bounds
        if(i + j < len(part)):
            nextPitch = part[i + j][0]

        #check if current pitch is the same as the next pitch
        while(currentPitch == nextPitch) and (i + j < len(part)):
            #gets the length of the next pitch's part tuple
            nextLength = int(float(part[i + j][1]))

            #appends the current pitch to newPart for the length of the next pitch
            for k in range(nextLength):
                newPart.append((currentPitch, 'C'))
            j += 1
            if(i + j < len(part)):
                nextPitch = part[i + j][0]  

        
        i += j

    newMelodyData.append(newPart)
    
print(newMelodyData)    

# output the note data to a file
with open("out/melodyData.txt", "w") as file:
    file.write(str(newMelodyData))


with open("out/keys.txt", "w") as file:
    file.write(str(keys))

print("Wrote to file successfully!")
print(f"Finished running in {time.time() - startTime:.3f} seconds")
