
import sys

def read_and_write_log(input_file, output_file):
    encodings = ['utf-16', 'utf-16-le', 'utf-16-be', 'utf-8', 'latin-1']
    for enc in encodings:
        try:
            with open(input_file, 'r', encoding=enc) as f:
                content = f.read()
                if content:
                    print(f"Read {input_file} with {enc}")
                    with open(output_file, 'w', encoding='utf-8') as out:
                        out.write(content[-5000:]) # Last 5000 chars
                    return
        except Exception:
            continue
    print(f"Could not read {input_file}")

if __name__ == "__main__":
    read_and_write_log("task_debug.log", "log_diagnostic.txt")
