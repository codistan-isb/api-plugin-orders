export async function formatPhoneNumber(phone) {
    // Format the phone number
    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');

    if (phone.startsWith('92')) {
    } else if (phone.startsWith('0092')) {
        phone = phone.slice(2);
    } else if (phone.startsWith('092')) {
        phone = phone.slice(1);
    } else if (phone.startsWith('0')) {
        phone = '92' + phone.slice(1);
    } else {
        phone = '92' + phone;
    }
    return phone;
}