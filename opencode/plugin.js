/**
 * mellum-worker plugin for OpenCode (V1 API, 1.18.x).
 *
 * Its only job is to make the mellum-setup skill discoverable: it appends this
 * package's skills/ directory to the merged config's skills.paths. It registers
 * no provider, agent, or model; the skill writes those into the user's files.
 *
 * No dependencies, so a git install needs nothing beyond this file.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "skills");

export const MellumWorkerPlugin = async (_ctx) => ({
	config: async (cfg) => {
		if (Array.isArray(cfg.skills)) return; // V2 shape; not handled by this plugin
		cfg.skills = cfg.skills || {};
		cfg.skills.paths = cfg.skills.paths || [];
		if (!cfg.skills.paths.includes(SKILLS_DIR)) cfg.skills.paths.push(SKILLS_DIR);
	},
});

export default { id: "mellum-worker", server: MellumWorkerPlugin };
