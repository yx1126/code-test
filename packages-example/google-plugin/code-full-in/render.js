if(!window.onResponse) {
    window.onResponse = [];
}
window.onResponse.push(function(data) {
    console.log(data);
});
