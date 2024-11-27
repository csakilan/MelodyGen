# load midi files from Mono-Melodies-All/Flute
# music21.converter.parse(filename) can be used
# to convert a midi file to a music21 stream
import os 
# import music21
import music21
from fractions import Fraction
import time
import traceback
import warnings
import threading

import music21.midi.translate

# load files from all given folders
read_all_files = False
include_triplets = True
folders_to_load = ["Mono-Melodies-All/Flute","Mono-Melodies-All/Clarinet","Mono-Melodies-All/Choir Aahs", "Mono-Melodies-All/Alto Sax", "Mono-Melodies-All/Acoustic Guitar", "Mono-Melodies-All/Acoustic Grand Piano"] if read_all_files else ["Mono-Melodies-All/Flute"]
key_skip_threshold = .8
num_threads = 16

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
combinedMelodyData: list[list[(int, float)]] = []


def cleanUpMelody(melodyData, notes: list[music21.note.Note | music21.note.Rest], time_signature):
    # global notes, note_count

    
    # Do not try to add a melody if there are no notes
    if len(notes) <= 16:
        return
    
    for n in range(len(notes) - 1):
        # cut overlapping notes short
        if((notes[n].offset + notes[n].duration.quarterLength) > notes[n+1].offset):
            notes[n].duration.quarterLength = notes[n+1].offset - notes[n].offset
            ratio = notes[n].duration.quarterLength.as_integer_ratio()
            if not(4 % ratio[1] == 0 or (ratio[1] == 3)):
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
                #print(durationStr)
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
    
    # analyze for the key of the melody
    my_stream = music21.stream.Stream()
    for note in melody:
        if note[0] == 0:
            my_stream.append(music21.note.Rest(quarterLength=float(note[1])))
        else:
            my_stream.append(music21.note.Note(midi=note[0], quarterLength=float(note[1])))
    
    analysis = music21.analysis.discrete.AardenEssen()
    key_signature: music21.key.Key = analysis.getSolution(my_stream)
    if key_signature.correlationCoefficient < key_skip_threshold:
        return
    print("Melody key:", key_signature, key_signature.correlationCoefficient, "Melody length:", len(melody))

    root = key_signature.tonic.midi % 12
    # offset is largest root that is <= min_pitch
    offset = min_pitch % 12 - root
    offset = offset if offset <= 0 else offset - 12
    melody = [(note[0] - (min_pitch) - offset + 1, note[1]) if note[0] != 0 else note for note in melody]

    part = []

    # (11, 2.00) -> (11, 1.00), (C, C)
    for i, note in enumerate(melody):
        duration = Fraction(note[1])
        f_part = 1 if duration % 1 == 0 else duration % 1
        part.append((note[0], durationToString(f_part)))
        duration -= f_part
        while duration > 0:
            part.append(('C', 'C'))
            duration -= 1

    melody = part

    if time_signature is not None:

        # PREPEND-------------------- time signature and key signature to melody
        key_sig = key_signature.name[(len(key_signature.name)) - 5:]
        melody.insert(0, (key_sig, str(time_signature.ratioString)))
        
    else:
        return
        
    # note_count += len(melody)
    melodyData.append(melody)
    if display_output:
        print("Added melody of", len(melody), "notes from", part.partName)
    notes.clear()

def readFiles(files, result, thread_index):
    melodyData: list[list[(int, float)]] = []
# for file_index in range(file_count):
    for file in files:
        try:
            stream = music21.instrument.partitionByInstrument(music21.converter.parse(file, format="midi"))
            # streams.append(stream)
            print("Read file", file)
            # if display_file_output:
                # progress = (file_index + 1) / file_count * 100
                # progress_int = int(round(progress / (100 / PROGRESS_CHARACTERS)))
                # last_slash = file.rfind("/")
                # elapsed_seconds = time.time() - startTime
                # est_seconds = (file_count - file_index) / (file_index + 1) * (time.time() - startTime)
                # print(f'\33[2K[{"#" * progress_int}{"-" * (PROGRESS_CHARACTERS - progress_int)}] {progress:.1f}% - {file[:last_slash] + "/" + file[last_slash + 1:last_slash+7] + "..."} ({len(melodyData)} melodies, {note_count} notes) - Running for {int(elapsed_seconds / 60):d}:{int(elapsed_seconds % 60):02d}, est {int(est_seconds / 60):d}:{int(est_seconds % 60):02d}', end="\r")
                #print(f"\33[2K[{"#" * progress_int}{"-" * (PROGRESS_CHARACTERS - progress_int)}] {progress:.1f}% - {file[:last_slash] + "/" + file[last_slash + 1:last_slash+7] + "..."} ({len(melodyData)} melodies, {note_count} notes)", end="\r")

            for part in stream.parts:
                if part.partName is not None:
                    # instr = part.getElementsByClass("Instrument")
                    # print (instr[0].midiProgram)

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

                    note: music21.note.Note | music21.note.Rest
                    for note in part.notesAndRests:
                        # remove melodies that contain notes with odd fractions
                        dur = (note.duration.quarterLength).as_integer_ratio()

                        if not(4 % dur[1] == 0):
                            shouldSkip = True
                            break
                        
                        # remove melodies that contain triplets or 0.67
                        if ("Triplet" in note.fullName or str(note.duration.quarterLength) == "0.67"):
                            print(note.fullName)
                            shouldSkip = True
                            break

                        
                        # record rests as '0'
                        if isinstance(note, music21.note.Rest):
                            # Try splitting the melody if whole rest
                            if abs(note.duration.quarterLength - 4.0) < TOLERANCE:
                                cleanUpMelody(melodyData, notes, time_signature)
                            else:
                                notes.append(note)
                        elif isinstance(note, music21.note.Note):
                            notes.append(note)
                        else:
                            # if a chord is found, skip the entire part
                            shouldSkip = True
                            break
                
                    if not shouldSkip:
                        cleanUpMelody(melodyData, notes, time_signature)
                
            print("Done with", file)
        except music21.midi.MidiException as e:
            print(f"Error reading {file}: {e}\n")
        except Exception as e:
            if display_file_output:
                traceback.print_exc()
    result[thread_index] = melodyData

threads = []
result = [None] * num_threads
for i in range(num_threads):
    start = i * len(files) // num_threads
    end = (i + 1) * len(files) // num_threads
    streams = []
    thread = threading.Thread(target=readFiles, args=(files[start:end], result, i))
    threads.append(thread)
    thread.start()

for thread in threads:
    thread.join()

combinedMelodyData = [melody for thread in result for melody in thread if melody is not None]

# output the note data to a file
with open("out/melodyData.txt", "w") as file:
    file.write(str(combinedMelodyData))


with open("out/keys.txt", "w") as file:
    file.write(str(keys))

print("Wrote to file successfully!")
print(f"Finished running in {time.time() - startTime:.3f} seconds")
