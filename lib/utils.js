"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const core = __importStar(require("@actions/core"));
const dockleHelper = __importStar(require("./dockleHelper"));
const gitHubHelper = __importStar(require("./gitHubHelper"));
const inputHelper = __importStar(require("./inputHelper"));
const trivyHelper = __importStar(require("./trivyHelper"));
const fileHelper = __importStar(require("./fileHelper"));
function getCheckRunPayload(trivyStatus, dockleStatus) {
    const headSha = gitHubHelper.getHeadSha();
    const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
    const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
    const checkText = getCheckText(trivyStatus, dockleStatus);
    const checkRunPayload = {
        head_sha: headSha,
        name: `[container-scan] ${inputHelper.imageName}`,
        status: "completed",
        conclusion: checkConclusion,
        output: {
            title: "Container scan result",
            summary: checkSummary,
            text: checkText
        }
    };
    return checkRunPayload;
}
exports.getCheckRunPayload = getCheckRunPayload;
function getCheckRunThroughAppPayload(trivyStatus, dockleStatus) {
    const headSha = gitHubHelper.getHeadSha();
    const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
    const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
    const checkText = getCheckText(trivyStatus, dockleStatus);
    const checkRunThroughAppPayload = {
        action_name: process.env['GITHUB_ACTION'],
        action_sha: process.env['GITHUB_ACTION'],
        additional_properties: {
            conclusion: checkConclusion,
            is_pull_request: gitHubHelper.isPullRequestTrigger()
        },
        description: checkText,
        head_sha: headSha,
        image_name: inputHelper.imageName,
        status: "completed",
        summary: checkSummary
    };
    return checkRunThroughAppPayload;
}
exports.getCheckRunThroughAppPayload = getCheckRunThroughAppPayload;
function getScanReport(trivyStatus, dockleStatus) {
    const scanReportPath = `${fileHelper.getContainerScanDirectory()}/scanreport.json`;
    let trivyOutput = [];
    if (trivyStatus === trivyHelper.TRIVY_EXIT_CODE)
        trivyOutput = trivyHelper.getFilteredOutput();
    let dockleOutput = [];
    if (inputHelper.isRunQualityChecksEnabled() && dockleStatus === dockleHelper.DOCKLE_EXIT_CODE)
        dockleOutput = dockleHelper.getFilteredOutput();
    const scanReportObject = {
        "vulnerabilities": trivyOutput,
        "bestPracticeViolations": dockleOutput
    };
    fs.writeFileSync(scanReportPath, JSON.stringify(scanReportObject, null, 2));
    return scanReportPath;
}
exports.getScanReport = getScanReport;
function getConfigForTable(widths) {
    let config = {
        columns: {
            0: {
                width: widths[0],
                wrapWord: true
            },
            1: {
                width: widths[1],
                wrapWord: true
            },
            2: {
                width: widths[2],
                wrapWord: true
            },
            3: {
                width: widths[3],
                wrapWord: true
            }
        }
    };
    return config;
}
exports.getConfigForTable = getConfigForTable;
function extractErrorsFromLogs(outputPath, toolName) {
    const out = fs.readFileSync(outputPath, 'utf8');
    const lines = out.split('\n');
    let errors = [];
    lines.forEach((line) => {
        const errIndex = line.indexOf("FATAL");
        if (errIndex >= 0) {
            const err = line.substring(errIndex);
            errors.push(err);
        }
    });
    return errors;
}
exports.extractErrorsFromLogs = extractErrorsFromLogs;
function addLogsToDebug(outputPath) {
    const out = fs.readFileSync(outputPath, 'utf8');
    core.debug(out);
}
exports.addLogsToDebug = addLogsToDebug;
function getCheckConclusion(trivyStatus, dockleStatus) {
    const checkConclusion = trivyStatus != 0 ? 'failure' : 'success';
    return checkConclusion;
}
function getCheckSummary(trivyStatus, dockleStatus) {
    const header = `Scanned image \`${inputHelper.imageName}\`.\nSummary:`;
    const trivySummary = trivyHelper.getSummary(trivyStatus);
    let summary = `${header}\n\n${trivySummary}`;
    if (inputHelper.isRunQualityChecksEnabled()) {
        const dockleSummary = dockleHelper.getSummary(dockleStatus);
        summary = `${summary}\n\n${dockleSummary}`;
    }
    return summary;
}
function getCheckText(trivyStatus, dockleStatus) {
    const separator = '___';
    const trivyText = trivyHelper.getText(trivyStatus);
    let text = trivyText;
    if (inputHelper.isRunQualityChecksEnabled()) {
        const dockleText = dockleHelper.getText(dockleStatus);
        text = `${text}\n${separator}\n${dockleText}`;
    }
    return text;
}