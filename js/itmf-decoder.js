var file;

const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
    const fileList = event.target.files;
    file = readORBXFile(fileList[0]);

});

function appendLinebreak() {
    var elem = document.getElementById('orbxInfo');

    var linebreak = document.createElement('br');

    elem.appendChild(linebreak);
}

function clearDiv(elementId) {
    document.getElementById(elementId).innerHTML = '';
}

function BMLElementDisplay(padding = '') {
    var elem = document.getElementById('orbxInfo');

    if(this.type == 'OBJECT') {
        var open = document.createTextNode(`${padding}${this.type}(${this.id}) {`);
        
        elem.appendChild(open);
        appendLinebreak();
        padding += '\u00A0';
        for(var i = 0; i < this.value.length; i++) {

            this.value[i].display(padding);
        }

        elem.appendChild(document.createTextNode(`${padding}}`));
        appendLinebreak();
    } else {
        var val = `${padding}${this.type}(${this.id}) ${this.value}`;

        var text = document.createTextNode(val);

        elem.appendChild(text);
        appendLinebreak();
    }
}

function BMLElement(type, id, value, binary_str) {
    this.type = type; // BMLElementType
    this.id = id;
    this.value = value;
    this.binary_str = binary_str;

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
            var view = new Uint32Array(buffer, buffer.length - 2, 2);
            
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
        all_bytes = all_bytes.concat(to_add);
    }
    
    filepos += num_add_bytes;

    // Need to read bytes as follows - first as tag encoding
    // Once tag encoding is decoded into id/type
    // Get the value depending on the id/type
    var decoded_tag = decodeTag(all_bytes);
    var binarystr = '';
    switch(decoded_tag[0]) {
        case 'CLOSE': // Close shouldn't be ever entered - this will notify when Object is closed
            break;
        case 'OBJECT':
            value = []
            var close = false;
            filepos += 1;

            while(!close) {
                var s = stringToBinary(buffer[filepos]);
                // console.log(`${filepos-1}: ${stringToBinary(buffer[filepos - 1])}`);

                var decoded_s = decodeTag(s);

                if(decoded_s[0] == 'CLOSE') {
                    close = true;

                    break;
                } else {
                    var temp = createBMLElement(s, buffer, filepos);
                    value.push(temp.bml_elem);
                    filepos = temp.filepos;
                }
            }
            break;
        case 'INTEGER':
            
            binarystr = stringToBinary(buffer[filepos + 1]);
            var int_byte_size = calculateTotalBytes(binarystr);
            filepos += 1;
            
            for(var j = 0; j < int_byte_size; j++) {
                var to_add = stringToBinary(buffer[filepos + j]);
                binarystr = binarystr.concat(to_add);
            }

            value = binaryToVSIE(binarystr);

            filepos += int_byte_size;

            break;
        case 'LONG':
            
            binarystr = stringToBinary(buffer[filepos + 1]);
            var long_byte_size = calculateTotalBytes(binarystr);
            
            filepos += 1;

            for(var j = 0; j < long_byte_size; j++) {
                var to_add = stringToBinary(buffer[filepos + j + 1]);
                binarystr = binarystr.concat(to_add);
            }
            
            value = binaryToVSIE(binarystr);
            // console.log(binarystr);
            filepos += long_byte_size;

            break;
        case 'STRING':
            binarystr = stringToBinary(buffer[filepos + 1]);
            var l = binaryToVUIE(binarystr);
            filepos += 1;
            value = buffer.slice(filepos + 1, filepos + l + 1);
            filepos += l;

            break;
        case 'SINGLE':
            var single = '';

            for(var j = 0; j < 4; j++) {
                var to_add = stringToBinary(buffer[filepos + j + 1]);

                single = single.concat(to_add);
            }

            filepos += 4;
            break;
        case 'DOUBLE':
            console.log(byte)
            var double = '';
            for(var j = 0; j < 8; j++) {
                var to_add = stringToBinary(buffer[filepos + j + 1]);

                double = double.concat(to_add);
            }
            console.log(double);
            filepos += 8;
            break;
        case 'BLOB':
            binarystr = stringToBinary(buffer[filepos + 1]);
            filepos += 1;
            var blob_len_num_bytes = calculateTotalBytes(binarystr);
            for(var j = 0; j < blob_len_num_bytes; j++) {
                var to_add = stringToBinary(buffer[filepos + j + 1]);
                binarystr = binarystr.concat(to_add);
            }

            var l = binaryToVUIE(binarystr);
            filepos += blob_len_num_bytes;
            value = buffer.slice(filepos + 1, filepos + l + 1);
            filepos += l;

            break;
    }

    var bml_elem = new BMLElement(decoded_tag[0], decoded_tag[1], value, binarystr);
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

function readChunks(buffer, filepos) {
    var done = false;
    chunks = []
    while(!done) {
        var s = stringToBinary(buffer[filepos]);
        var decoded_s = decodeTag(s);

        if(decoded_s[0] != 'OBJECT') {
            var bml_values = createBMLElement(s, buffer, filepos);
            chunks.push(bml_values.bml_elem);
            
            filepos = bml_values.filepos;
        } else {
            done = true;
        }
    }
    console.log(chunks)
    return {chunks: chunks, filepos: filepos};
}

function readLogicalUnit(buffer, filepos) {
    var s = stringToBinary(buffer[filepos]);
    var lu_values = createBMLElement(s, buffer, filepos);

    return {logicalUnit: lu_values.bml_elem, filepos: lu_values.filepos};
}

function readFooter(buffer, filepos) {
    footer = {}

    var offsetBuffer = new Array(); // 4 byte array buffer
    var magicBuffer = new Array();

    for(var i = 0; i < 4; i++) {
        offsetBuffer.push(buffer.charCodeAt(filepos + i));
        magicBuffer.push(buffer.charCodeAt(filepos + i + 4));
    }
    var mb = new Uint8Array(magicBuffer).buffer;
    var ob = new Uint8Array(offsetBuffer).buffer;

    var mdv = new DataView(mb);
    var odv = new DataView(ob);

    // console.log(odv.getUint32(0, true)); // little endian
    // console.log(mdv.getUint32(0, true)); // little endian

    footer.streamEndOffset = odv.getUint32(0, true);
    footer.magic = mdv.getUint32(0, true);

    filepos += 8;

    return {footer: footer, filepos: filepos};
}

function displayFooter(footer) {
    var elem = document.getElementById('orbxInfo');
    var foot = document.createTextNode('ITMF FOOTER');
                    
    elem.appendChild(foot);
    appendLinebreak();

    var streamOff = document.createTextNode(`uint32_t ${footer.streamEndOffset}`);
    var magic = document.createTextNode(`uint32_t 0x${footer.magic.toString(16)}`);

    elem.appendChild(streamOff);
    appendLinebreak();
    elem.appendChild(magic);
    appendLinebreak();
}

// Encrypted logical units?
// Compressed logical units?
function readORBXFile(f) {
    if(f) {
        clearDiv('orbxInfo');
        const reader = new FileReader();
        var properties_read = false;

        ORBXObject = {}
        
        reader.onload = function(e) {
            var contents = e.target.result;
            var buffer = reader.result;

            // Reads one byte at a time
            var i = 0;

            // Read Header
            var s = stringToBinary(buffer[i]); // first byte

            var header_vals = readHeader(buffer, i);
            var header = header_vals.header;
            ORBXObject.header = header;
            i = header_vals.filepos;

            var elem = document.getElementById('orbxInfo');
            var head = document.createTextNode('ITMF HEADER');

            elem.appendChild(head);
            appendLinebreak();
            for(var j = 0; j < ORBXObject.header.length; j++) {
                ORBXObject.header[j].display();
            }

            appendLinebreak();
            // Check flags to see which logical units are present
            var format = readFlags(header[2].value);
        
            if(decodeTag(stringToBinary(buffer[i]))[0] == 'OBJECT' && format.includes("PROPERTIES")) {
                // Properties are encoded before streams
                var prop_values = readLogicalUnit(buffer, i);
                var properties = prop_values.logicalUnit;
                ORBXObject.properties = properties;
                i = prop_values.filepos;
                properties_read = true;

                
                var props = document.createTextNode('PROPERTIES');
                elem.appendChild(props);
                appendLinebreak();
                ORBXObject.properties.display();

                appendLinebreak();
            }

            if(format.includes("STREAMSATSTART")) {
                // If StreamsAtStart read streams
                
                // Skip reading streams for time being
                var chunk_vals = readChunks(buffer, i);
                i = chunk_vals.filepos;
                ORBXObject.chunks = chunk_vals.chunks;
                
                // Check for properties
                if(!properties_read && format.includes("PROPERTIES")) {
                    var prop_values = readLogicalUnit(buffer, i);
                    var properties = prop_values.logicalUnit;
                    ORBXObject.properties = properties;
                    i = properties.filepos;
                    properties_read = true;

                    var props = document.createTextNode('PROPERTIES');
                    elem.appendChild(props);
                    appendLinebreak();
                    ORBXObject.properties.display();
                }

                // StreamHeaders 
                // console.log(stringToBinary(buffer[i]));
                var header_values = readLogicalUnit(buffer, i);
                ORBXObject.streamHeaders = header_values.logicalUnit;
                i = header_values.filepos;
                var sh = document.createTextNode('STREAMHEADERS');
                elem.appendChild(sh);
                appendLinebreak();
                ORBXObject.streamHeaders.display();
                appendLinebreak();

                // Index - Check flag
                if(format.includes("INDEX")) {
                    var ind = document.createTextNode('INDEX');
                    elem.appendChild(ind);
                    appendLinebreak();

                    var index = readLogicalUnit(buffer, i);
                    ORBXObject.index = index.logicalUnit;
                    i = index.filepos;

                    ORBXObject.index.display();
                    appendLinebreak();
                }

                // Directory - Check flag
                if(format.includes("DIRECTORY")) {
                    var dir = document.createTextNode('DIRECTORIES');
                    elem.appendChild(dir);
                    appendLinebreak();

                    var directory = readLogicalUnit(buffer, i);
                    ORBXObject.directory = directory.logicalUnit;
                    i = directory.filepos;

                    ORBXObject.directory.display();
                    appendLinebreak();
                }

                if(format.includes("SIGNED")) {
                    var signature = readLogicalUnit(buffer, i);
                    ORBXObject.signature = signature.logicalUnit;
                    i = signature.filepos;
                }
            
                // ITMF Footer 
                var footer = readFooter(buffer, i);
                ORBXObject.footer = footer.footer;
                i = footer.filepos;
                

                if(ORBXObject.footer.magic != 0x9f5a1104) {
                    alert('Error reading file!');
                } else {
                    displayFooter(ORBXObject.footer);
                }
            } else if(format.includes("STREAMSATEND")) {
                // If StreamsAtEnd

                // StreamHeaders
                var header_values = readLogicalUnit(buffer, i);
                ORBXObject.streamHeaders = header_values.logicalUnit;
                i = header_values.filepos;

                // Index
                if(format.includes("INDEX")) {
                    var index = readLogicalUnit(buffer, i);
                    ORBXObject.index = index.logicalUnit;
                    i = index.filepos;
                }

                // Directory
                if(format.includes("DIRECTORY")) {
                    var directory = readLogicalUnit(buffer, i);
                    ORBXObject.directory = directory.logicalUnit;
                    i = directory.filepos;
                }

                // Signature
                if(format.includes("SIGNED")) {
                    var signature = readLogicalUnit(buffer, i);
                    ORBXObject.signature = signature.logicalUnit;
                    i = signature.filepos;
                }

                // NO FOOTER
            }
        }

        reader.readAsBinaryString(f);
    } else {
        alert("Failed to load file");
    }
    console.log(ORBXObject);
    return ORBXObject;
}

// Takes a tag and returns the BML type and id
function decodeTag(tag) {
    var entries = Object.entries(BMLElementType).reverse();
    var i = binaryToVUIE(tag);

    for(const entry of entries) {
        var type = entry[1] & tag;
        if(type === entry[1]) {
            // 
            return [entry[0], i >> 3];
        }
    }

    return null;
}