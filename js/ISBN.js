function addChecksum(isbn12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(isbn12[i], 10);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    return isbn12 + ((10 - (sum % 10)) % 10); // Append checksum
}
