/* jshint node:true */

const defaultPathRadio = document.querySelector('#default-path');
const customPathRadio = document.querySelector('#custom-path');
const pathTextField = document.querySelector('#path-text');

defaultPathRadio.addEventListener('change', function(event) {
    if(!pathTextField.validity.valid){
        pathTextField.setCustomValidity('');
    }
});

pathTextField.addEventListener('input', function(event) {
    if(!this.validity.valid) this.setCustomValidity('');
    
    // Update the radio input's value to match the text input's
    customPathRadio.value = this.value;
});

window.addEventListener('keypress', (event) => {
    switch(event.key){
        case 'Enter':
            // Prevent submitting with the Enter key from the text input field
            if(event.target.id === 'path-text'){
                event.preventDefault();
            }
            break;
    }
});

document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const pathValue = new FormData(event.target).get('docs-path');
    
    console.log(event);
    console.log(pathValue);
    
    if(pathValue === 'custom' || pathValue === ''){
        pathTextField.setCustomValidity('Please enter a valid path or select one from the menu');
        pathTextField.reportValidity();
    }
});