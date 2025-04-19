import sys
sys.dont_write_bytecode = True

from build import *

build_extension('chrome')