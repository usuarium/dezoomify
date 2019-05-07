"use strict";

export default class Browser
{
    constructor() {
        this.progressBar = document.getElementById("progressbar")
        this.percentageLabel = document.getElementById("percent")
        this.statusLabel = document.getElementById("status")
        
        window.onerror = function(errmsg, source, lineno) {
        	UI.error(errmsg + '\n\n(' + source + ':' + lineno + ')');
        }
    }
    
    /**
     * Update the state of the progress bar.
     * 
     * 
     * @param {Number} percentage (between 0 and 100)
     * @param {String} description current state description
     */
    updateProgress(percent, text) {
        percent = parseInt(percent);
        this.percentageLabel.innerHTML = text + ' (' + percent + "%)";
        this.progressBar.style.width = percent + "%";
        this.progressBar.setAttribute("aria-valuenow", percent);
        document.title = "(" + percent + "%) Dezoomify";
    }
    
    setupRendering(data) {
        this.statusLabel.className = "loading";
    }
    
    /**
     * Display an error in the UI.
     * 
     * @param {String} errmsg The error message
     */
    error(errmsg) {
        if (errmsg) {
            document.getElementById("errormsg").textContent = errmsg;
        }
        document.getElementById("percent").textContent = "";
        document.getElementById("error").removeAttribute("hidden");
        var error_img = "error.svg?error=" + encodeURIComponent(errmsg);
        document.getElementById("error-img").src = error_img;
    }
    
    /**
     * Reset the UI to the initial state.
     */
    reset() {
        document.getElementById("error").setAttribute("hidden", "hidden");
        document.getElementById("status").className = "";
    }
    
    /**
     * Update UI after the image has loaded.
     */
    loadEnd(blob) {
        var status = document.getElementById("status");
        var a = document.createElement("a");
        a.download = "dezoomify-result.jpg";
        a.href = "#";
        a.textContent = "Converting image...";
        a.className = "button";
        // Try to export the image
        var url = URL.createObjectURL(blob);
        a.href = url;
        a.textContent = "Save image";
        // status.className = "download";
        status.appendChild(a);
        status.className = "finished";
    }

    /**
     * Add a new button for a new dezoomer.
     * 
     * @param {Object} dezoomer the dezoomer object
     */
    addDezoomer(dezoomer) {
        var label = document.createElement("label")
        var input = document.createElement("input");
        input.type = "radio"
        input.name = "dezoomer";
        input.id   = "dezoomer-" + dezoomer.name;
        label.title= dezoomer.description;
        input.onclick = function() {
            ZoomManager.setDezoomer(dezoomer);
        }
        label.appendChild(input);
        label.appendChild(document.createTextNode(dezoomer.name));
        UI.dezoomers.appendChild(label);
    }

    /**
     * @brief Set the dezoomer that is currently used.
     * 
     * @param {String} dezoomerName name of the dezoomer
     */
    setDezoomer(dezoomerName) {
        document.getElementById(`dezoomer-${dezoomerName}`).checked = true;
    }
}

