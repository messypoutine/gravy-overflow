console.log(Array.from(process.env.FLAG_GRAVY_OVERFLOW_L0_GRAVY).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).reverse().join(''))
