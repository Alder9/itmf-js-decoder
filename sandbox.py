from bitarray import bitarray

class BitReader(object):

    '''Constructor
    signed - true = VSIE, false = VUIE
    '''
    def __init__(self, f, signed):
        self.file = f
        self.read = 0
        self.bitcount = 0
        self.signed = signed

    def _leftshift(self, ba, count):
        return ba[count:] + (bitarray('0') * count)

    def _rightshift(self, ba, count):
        return (bitarray('0') * count) + ba[:-count]

    def _readbyte(self):
        a = self.file.read(1)
        bits = bitarray(endian='big')
        print(a)
        print(ord(a))
        bits.frombytes(a)

        print(bits)
        print(self._leftshift(bitarray('00000001'), 3) | bitarray('00000110'))
        # print(bin(int(a)))
        # print(a)
        # print(ord(a))
        # result = []
        # bits = bin(ord(a))[2:]
        # # bits = '00000000'[len(bits):] + bits
        # result.extend([int(b, 2) for b in bits])
        # print(result)
        # print(''.join(format(i, 'b') for i in bytearray(a)))
        self.bitcount = 8
        self.read = len(a)

    def readbytes(self, n):
        v = 0
        while n > 0:
            self._readbyte()
            n -= 1

f = open('emptytest.orbx', 'rb')
reader = BitReader(f, False)
reader.readbytes(20)
# contents = list(f.read())
# byte_array = bytearray(f.read())
# print(byte_array)
f.close()