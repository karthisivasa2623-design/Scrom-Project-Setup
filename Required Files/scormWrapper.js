var scorm = pipwerks.SCORM;
scorm.version = "1.2";

var connected = scorm.init();
if (connected) {
    console.log("SCORM connected successfully");
    scorm.set("cmi.core.lesson_status", "incomplete");
    scorm.save();
} else {
    console.log("SCORM connection failed");
}

function setScore(score) {
    if (connected) {
        scorm.set("cmi.core.score.raw", score);
        scorm.set("cmi.core.lesson_status", "completed");
        scorm.save();
    } else {
        console.log("Cannot set score, SCORM not connected");
    }
}
