const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
    const fileList = event.target.files;
    console.log(fileList);
    readORBXFile(fileList[0]);
    // testReadORBXFile(fileList[0]);
});

function BMLElementDisplay() {
    console.log(`${this.type}(${this.id}) ${this.value}`);
}

function BMLElement(type, id, value) {
    this.type = type; // BMLElementType
    this.id = id;
    this.value = value;

    this.display = BMLElementDisplay;
}

function ITMFHeader() {

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

const Flags = {
    STREAMSATSTART: 1,
    STREAMSATEND: 2,
    INDEX: 4,
    DIRECTORY: 8,
    PROPERTIES: 16,
    SIGNED: 32
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

/**
 * 
 * @param {*} byte 
 * @param {*} buffer 
 * @param {*} filepos 
 * @return BMLElement or Array of BMLElements if an Object
 */
function createBMLElement(byte, buffer, filepos) {
    var num_add_bytes = calculateTotalBytes(byte);
    var all_bytes = byte;
    var value;

    // appending any subsequent bytes
    for(var j = 0; j < num_add_bytes; j++) {
        var to_add = stringToBinary(buffer[filepos + j + 1]);
        // console.log('adding: ' + to_add);
        all_bytes = all_bytes.concat(to_add);
    }
    console.log(all_bytes);
    filepos += num_add_bytes;

    // Need to read bytes as follows - first as tag encoding
    // Once tag encoding is decoded into id/type
    // Get the value depending on the id/type
    var decoded_tag = decodeTag(all_bytes);
    
    switch(decoded_tag[0]) {
        case 'CLOSE': // Close shouldn't be ever entered - this will notify when Object is closed
            console.log('NONONONO');
                                    
            break;
        case 'OBJECT':
            console.log('{');
            var object = []
            var close = false;
            filepos += 1;

            while(!close) {
                var s = stringToBinary(buffer[filepos]);
                var decoded_s = decodeTag(s);

                if(decoded_s[0] == 'CLOSE') {
                    console.log('}')
                    close = true;
                    filepos += 1;

                    break;
                } else {
                    var temp = createBMLElement(s, buffer, filepos);
                    console.log(temp);
                    object.push(temp.bml_elem);
                    filepos = temp.filepos;
                }
            }
            return {bml_elem: object, filepos: filepos};
        case 'INTEGER':
            console.log('integer');
            var str_int = stringToBinary(buffer[filepos + 1]);
            var int_byte_size = calculateTotalBytes(str_int);
            filepos += 1;
            
            for(var j = 0; j < int_byte_size; j++) {
                var to_add = stringToBinary(buffer[filepos + j]);
                // console.log('adding: ' + to_add);
                str_int = str_int.concat(to_add);
            }
            // console.log(str_int)

            value = binaryToVSIE(str_int);
            console.log(value);

            filepos += int_byte_size;

            break;
        case 'LONG':
            console.log('long');
            var str_long = stringToBinary(buffer[filepos + 1]);
            var long_byte_size = calculateTotalBytes(str_long);
            
            filepos += 1;

            for(var j = 0; j < long_byte_size; j++) {
                var to_add = stringToBinary(buffer[filepos + j + 1]);
                // console.log('adding: ' + to_add);
                str_long = str_long.concat(to_add);
            }
            console.log(str_long);
            value = binaryToVSIE(str_long);
            console.log(value);

            filepos += long_byte_size;

            break;
        case 'STRING':
            console.log('string');
            var str_len = stringToBinary(buffer[filepos + 1]);
            var l = binaryToVUIE(str_len);
            filepos += 1;
            value = buffer.slice(filepos + 1, filepos + l + 1);
            console.log(value);
            filepos += l;

            break;
        case 'SINGLE':
            console.log('single');

            var single = '';

            for(var j = 0; j < 3; j++) {
                var to_add = stringToBinary(buffer[filepos + j + 1]);

                single = single.concat(to_add);
            }

            console.log(single);

            filepos += 3;
            break;
        case 'DOUBLE':
            console.log('double');

            filepos += 1;
            break;
        case 'BLOB':
            console.log('blob');

            var blob_len = stringToBinary(buffer[filepos + 1]);
            filepos += 1;
            var blob_len_num_bytes = calculateTotalBytes(blob_len);
            for(var j = 0; j < blob_len_num_bytes; j++) {
                var to_add = stringToBinary(buffer[filepos + j + 1]);
                // console.log('adding: ' + to_add);
                blob_len = blob_len.concat(to_add);
            }

            var l = binaryToVUIE(blob_len);
            // console.log(l);
            filepos += blob_len_num_bytes;
            value = buffer.slice(filepos + 1, filepos + l + 1);
            // console.log(value);
            filepos += l;

            break;
    }

    var bml_elem = new BMLElement(decoded_tag[0], decoded_tag[1], value);
    filepos += 1;

    return {bml_elem: bml_elem, filepos: filepos};
}

function readHeader(buffer, filepos) {
    var header = [];

    var s = stringToBinary(buffer[filepos]);
    var ox_values = createBMLElement(s, buffer, filepos);
    var ox = ox_values.bml_elem;
    filepos = ox_values.filepos;
    header.push(ox);

    s = stringToBinary(buffer[filepos]);
    var version_values = createBMLElement(s, buffer, filepos);
    var version = version_values.bml_elem;
    filepos = version_values.filepos;
    header.push(version);

    s = stringToBinary(buffer[filepos]);
    var flag_values = createBMLElement(s, buffer, filepos);
    var flags = flag_values.bml_elem;
    filepos = flag_values.filepos;
    header.push(flags);

    for(var i = 0; i < header.length; i++) {
        header[i].display();
    }

    return {header: header, filepos: filepos};
}

function readFlags(flags) {
    var entries = Object.entries(Flags);
    var format_flags = []
    for(const entry of entries) {
        var f = entry[1] & flags;
        if(f === entry[1]) {
            format_flags.push(entry[0]);
        }
    }  

    return format_flags;
}

function readProperties(buffer, filepos) {
    var s = stringToBinary(buffer[filepos]);
    var prop_values = createBMLElement(s, buffer, filepos);
    console.log(prop_values);
    
    return {properties: prop_values.bml_elem, filepos: prop_values.filepos};
}

function readChunks(buffer, filepos) {
    var done = false;
    while(!done) {
        console.log(filepos);
        var s = stringToBinary(buffer[filepos]);
        var decoded_s = decodeTag(s);

        if(decoded_s[0] != 'OBJECT') {
            var bml_values = createBMLElement(s, buffer, filepos);
            console.log(bml_values.bml_elem);
            filepos = bml_values.filepos;
        } else {
            done = true;
        }
    }

    return filepos;
}

function readStreamHeaders(buffer, filepos) {
    var s = stringToBinary(buffer[filepos]);
    var header_values = createBMLElement(s, buffer, filepos);
    console.log(header_values);

    return {streamHeaders: header_values.bml_elem, filepos: header_values.filepos};
}

function readIndex(buffer, filepos) {

}

function readORBXFile(f) {
    if(f) {
        const reader = new FileReader();
        var properties_read = false;

        ORBXObject = {}
        
        reader.onload = function(e) {
            var contents = e.target.result;
            var buffer = reader.result;

            // Reads one byte at a time
            var i = 0;

            console.log('reading ' + buffer.length + ' bytes');
            
            // Read Header
            var s = stringToBinary(buffer[i]); // first byte

            var header_vals = readHeader(buffer, i);
            var header = header_vals.header;
            ORBXObject.header = header;
            i = header_vals.filepos;

            // Check flags to see which logical units are present
            var format = readFlags(header[2].value);
            console.log('Flags:');
            console.log(format);

            // console.log(i);
            if(decodeTag(stringToBinary(buffer[i]))[0] == 'OBJECT' && format.includes("PROPERTIES")) {
                // Properties are encoded before streams
                var prop_values = readProperties(buffer, i);
                var properties = prop_values.properties;
                ORBXObject.properties = properties;
                i = prop_values.filepos;
                properties_read = true;

                console.log("Properties: ");
                for(var j = 0; j < properties.length; j++) {
                    properties[j].display();
                }
            }

            if(format.includes("STREAMSATSTART")) {
                // If StreamsAtStart read streams
                console.log(ORBXObject);
                // Skip reading streams for time being
                i = readChunks(buffer, i);

                // Check for properties
                if(!properties_read) {
                    var prop_values = readProperties(buffer, i);
                    var properties = prop_values.properties;
                    ORBXObject.properties = properties;
                    i = properties.filepos;
                    properties_read = true;
                }

                // StreamHeaders
                // console.log(stringToBinary(buffer[i]));
                var header_values = readStreamHeaders(buffer, i);
                ORBXObject.streamHeaders = header_values.streamHeaders;
                i = header_values.filepos;
                console.log(ORBXObject);
                
                // Index
                // Directory
                // ITMF Footer
            } else if(format.includes("STREAMSATEND")) {
                // If StreamsAtEnd

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
    var i = binaryToVUIE(tag);

    for(const entry of entries) {
        var type = entry[1] & tag;
        if(type === entry[1]) {
            // console.log(tag);
            return [entry[0], i >> 3];
        }
    }

    return null;
}