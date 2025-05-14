import os

flag_0: str = os.environ["toto"]

print("extracting flag...")
print("flag: ", flag_0[1:])
print("flag: ", flag_0[:-1])
