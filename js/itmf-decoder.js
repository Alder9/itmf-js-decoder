const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
    const fileList = event.target.files;
    console.log(fileList);
    readORBXFile(fileList[0]);
});

const BMLElements = {
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

}

function binaryToVSIE(input) {

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
            while (i != (buffer.length - 1)) {
                var s = stringToBinary(buffer[i]);
                
                var num_add_bytes = 0; // since it is variable we need to check how many bytes are 

                // Checking number of subsequent bytes
                for(var j = 0; j < s.length; j++) {
                    if(s[j] == 0) {
                        break;
                    }

                    num_add_bytes += 1;
                }

                var new_s = s;
                // console.log(new_s);
                // console.log('additional bytes: ' + num_add_bytes);

                // appending any subsequent bytes
                for(var j = 0; j < num_add_bytes; j++) {
                    var to_add = stringToBinary(buffer[i + j + 1]);
                    // console.log('adding: ' + to_add);
                    new_s = new_s.concat(to_add);
                }
                console.log(new_s);

                i += (1 + num_add_bytes);
            }

            console.log('done reading ' + (i + 1) + ' bytes');
        }

        reader.readAsBinaryString(f);
    } else {
        alert("Failed to load file");
    }
}

```
Takes a tag and returns the BML type and id
```
function decodeTag(tag) {
    var entries = Object.entries(BMLElements).reverse();
    for(const entry of entries) {
        var type = entry[1] & tag;
        if(type === entry[1]) {
            
            return [entry[0], tag >> 3];
        }
    }
}

function readHeader(headerView) {
    for (var i = 0; i < headerView.length; i++) {
       console.log(headerView[i]);
       console.log(decodeTag(headerView[i]));
    }
}