const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://username:password@localhost:27017/smartcourse?authSource=admin&directConnection=true";

const ProjectSchema = new mongoose.Schema({
    name: String,
    tenant_id: String,
    school_id: String,
    config_version: String,
    current_stage: String,
    stages: mongoose.Schema.Types.Mixed,
});

const Project = mongoose.model('Project', ProjectSchema);

async function getProjectId() {
    await mongoose.connect(MONGODB_URI);
    const project = await Project.findOne({});
    if (project) {
        console.log(project._id.toString());
    } else {
        console.log("No project found");
    }
    await mongoose.disconnect();
}

getProjectId();
