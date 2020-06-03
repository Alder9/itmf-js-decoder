const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
    const fileList = event.target.files;
    console.log(fileList);
    readORBXFile(fileList[0]);
    testReadORBXFile(fileList[0]);
});

function BMLElementDisplay() {
    print(`${this.type}(${this.id}) ${this.value}`);
}

function BMLElement(type, id, value) {
    this.type = type; // BMLElementType
    this.id = id;
    this.value = value;

    this.display = BMLElementDisplay;
}

const BMLElementType = {
    CLOSE: 0,
    OBJECT: 1,
    INTEGER: 2,
    LONG: 3,
    SINGLE: 4,
    DOUBLE: 5,
    STRING: 6,
    BLOB: 7
}

// https://stackoverflow.com/questions/53247588/converting-a-string-into-binary-and-back
function stringToBinary(input) {
    var characters = input.split('');

    return characters.map(function(char) {
        const binary = char.charCodeAt(0).toString(2)
        const pad = Math.max(8 - binary.length, 0);
        // Just to make sure it is 8 bits long.
        return '0'.repeat(pad) + binary;
    }).join('');
}

function binaryToVUIE(input) {
    var num_bytes = input.length / 8;
    var msb = input.slice(num_bytes, input.length);
    var i = parseInt(msb, 2);

    return i;
}

function binaryToVSIE(input) {
    var num_bytes = input.length / 8;
    var sign_bit = input.slice(num_bytes, num_bytes + 1);
    var msb = input.slice(num_bytes + 1, input.length);
    var i = parseInt(msb, 2);

    if(sign_bit === '0') {
        return i;
    } else {
        return i * -1;
    }
}

function calculateTotalBytes(first_byte) {
    var num_add_bytes = 0; // since it is variable we need to check how many bytes are 

    // Checking number of subsequent bytes
    for(var j = 0; j < first_byte.length; j++) {
        if(first_byte[j] == 0) {
            break;
        }

        num_add_bytes += 1;
    }

    return num_add_bytes;
}

function testReadORBXFile(f) {
    if(f) {
        const reader = new FileReader();

        reader.onload = function(e) {
            var buffer = reader.result;

            // console.log(buffer);
            var view = new Uint32Array(buffer, buffer.length - 2, 2);
            console.log(view);
        }

        reader.readAsArrayBuffer(f);

    } else {
        alert("Failed to load file");
    }
}

function readORBXFile(f) {
    if(f) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            var contents = e.target.result;
            var buffer = reader.result;
            // console.log(buffer);

            // Reads one byte at a time
            var i = 0;

            console.log('reading ' + buffer.length + ' bytes');
            var BMLdata = [];
            while (i < (buffer.length - 8)) {
                var s = stringToBinary(buffer[i]);
                
                var num_add_bytes = calculateTotalBytes(s);
                var new_s = s;
                console.log('new_s ' + new_s);
                // console.log(num_add_bytes);

                // appending any subsequent bytes
                for(var j = 0; j < num_add_bytes; j++) {
                    var to_add = stringToBinary(buffer[i + j + 1]);
                    // console.log('adding: ' + to_add);
                    new_s = new_s.concat(to_add);
                }

                i += num_add_bytes;

                // Need to read bytes as follows - first as tag encoding
                // Once tag encoding is decoded into id/type
                // Get the value depending on the id/type
                var decoded_tag = decodeTag(new_s);
                
                switch(decoded_tag[0]) {
                    case 'CLOSE': // Close shouldn't be ever entered - this will notify when Object is closed
                        console.log('}');
                                                
                        break;
                    case 'OBJECT':
                        console.log('{');

                        // Loop while the tag does not say close
                        
                        break;
                    case 'INTEGER':
                        console.log('integer');
                        var str_int = stringToBinary(buffer[i + 1]);
                        var int_byte_size = calculateTotalBytes(str_int);
                        i += 1;
                        
                        for(var j = 0; j < int_byte_size; j++) {
                            var to_add = stringToBinary(buffer[i + j]);
                            // console.log('adding: ' + to_add);
                            str_int = str_int.concat(to_add);
                        }
                        // console.log(str_int)

                        var int = binaryToVSIE(str_int);
                        console.log(int);

                        i += int_byte_size;

                        break;
                    case 'LONG':
                        console.log('long');
                        var str_long = stringToBinary(buffer[i + 1]);
                        var long_byte_size = calculateTotalBytes(str_long);
                        
                        i += 1;

                        for(var j = 0; j < long_byte_size; j++) {
                            var to_add = stringToBinary(buffer[i + j + 1]);
                            // console.log('adding: ' + to_add);
                            str_long = str_long.concat(to_add);
                        }

                        var long = binaryToVSIE(str_long);
                        console.log(long);

                        i += long_byte_size;

                        break;
                    case 'STRING':
                        console.log('string');
                        var str_len = stringToBinary(buffer[i + 1]);
                        var l = binaryToVUIE(str_len);
                        i += 1;
                        var val = buffer.slice(i + 1, i + l + 1);
                        console.log(val);
                        i += l;

                        break;
                    case 'SINGLE':
                        console.log('single');

                        var single = '';

                        for(var j = 0; j < 3; j++) {
                            var to_add = stringToBinary(buffer[i + j + 1]);

                            single = single.concat(to_add);
                        }

                        console.log(single);

                        i += 3;
                        break;
                    case 'DOUBLE':
                        console.log('double');

                        i += 5;
                        break;
                    case 'BLOB':
                        console.log('blob');

                        var blob_len = stringToBinary(buffer[i + 1]);
                        i += 1;
                        var blob_len_num_bytes = calculateTotalBytes(blob_len);
                        for(var j = 0; j < blob_len_num_bytes; j++) {
                            var to_add = stringToBinary(buffer[i + j + 1]);
                            // console.log('adding: ' + to_add);
                            blob_len = blob_len.concat(to_add);
                        }

                        var l = binaryToVUIE(blob_len);
                        console.log(l);
                        i += blob_len_num_bytes;
                        var val = buffer.slice(i + 1, i + l + 1);
                        console.log(val);
                        i += l;

                        break;
                }

                console.log('bytes read: ' + i);

                i += 1;

                // Store the type, id, and value somehow which can then be printed to
                //      human readable form as a way to check if spec is right

                // Process of reading?
                // Start with header - from that determine what is included in the
                //      file
                // Determine if StreamsAtStart (data streams followed by Properties, StreamHeaders, Index, Directory) 
                // or StreamsAtEnd (StreamHeader, Index, and Directory first followed by chunks of stream logical units, no footer)
            }

            console.log('done reading');
        }

        reader.readAsBinaryString(f);
    } else {
        alert("Failed to load file");
    }
}

// Takes a tag and returns the BML type and id
function decodeTag(tag) {
    var entries = Object.entries(BMLElementType).reverse();
    for(const entry of entries) {
        var type = entry[1] & tag;
        if(type === entry[1]) {
            
            return [entry[0], tag >> 3];
        }
    }

    return null;
}

function readHeader(headerView) {
    for (var i = 0; i < headerView.length; i++) {
       console.log(headerView[i]);
       console.log(decodeTag(headerView[i]));
    }
}