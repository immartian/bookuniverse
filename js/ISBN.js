export class ISBN {

    static addChecksum(isbn12) {
        let sum = 0;
        for (let i = 0; i < isbn12.length; i++) {
            const digit = parseInt(isbn12[i], 10);
            sum += i % 2 === 0 ? digit : digit * 3;
        }
        const checksum = (10 - (sum % 10)) % 10;
        return isbn12 + checksum;
    }
}