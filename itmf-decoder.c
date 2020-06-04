#include <stdio.h>

struct header {

};

int main(int argc, char **argv) {
    FILE *fptr;
    char* filename;
    char buffer[1];

    if (argc != 2) {
        fprintf(stderr, "usage: %s <*.orbx>\n", argv[0]);
        exit(1);
    }
    filename = argv[1];

    // printf(filename);
    fptr = fopen(filename, "rb");
    if(fptr == NULL) {
        printf("Error opening file!");
    }

    fread(buffer, 1, 1, fptr);

    printf(buffer);

    fclose(fptr);

    return 0;
}