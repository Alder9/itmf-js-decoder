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
            for (var i = 0; i < buffer.length; i++) {
                var s = stringToBinary(buffer[i]);
                console.log(s);
                
                var num_add_bytes = 0; // since it is variable we need to check how many bytes are 


                // Checking number of subsequent bytes
                for(var j = 0; j < s.length; j++) {
                    if(s[j] == 0) {
                        break;
                    }

                    num_add_bytes += 1;
                }
                console.log('additional bytes: ' + num_add_bytes);

                i += (num_add_bytes - 1);
                // console.log(s[0]);
            }
            // Assuming unencrypted
            // var headerBuff = buffer.slice(0, 8);
            // console.log(headerBuff);

            // var headerView = new Uint8Array(headerBuff);
            // console.log(headerView);

            // readHeader(headerView);
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