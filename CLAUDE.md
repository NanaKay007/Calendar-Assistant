# Guidance for task-focused agents
* All agents assigned a specific task must work in a different git worktree
* All code written must adhere to original instruction coupled with information from requirements.md and system-design.md.
* All code written must have integration tests that communicate with real clients/services or databases. Mocking interactions is not acceptable.
* All integration tests must pass
* After successful implementation, update dev-tasks.md, system-design.md as needed and create a PR.
* Next, after 1.5 minute wait intervals, pull comments from github and address high severity security issues and bugs. Repeat steps 2 - 7 until complete and alert me.
