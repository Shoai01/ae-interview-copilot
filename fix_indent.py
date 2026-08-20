with open('backend/services/viva_service.py', 'r') as f:
    content = f.read()

content = content.replace('                raise ValueError("Invalid trainee ID.")', '            raise ValueError("Invalid trainee ID.")')
content = content.replace('                raise ValueError("No session has been assigned to you by an admin or trainer.")', '            raise ValueError("No session has been assigned to you by an admin or trainer.")')
content = content.replace('                        raise ValueError("This session assignment has expired. Please contact your trainer.")', '                raise ValueError("This session assignment has expired. Please contact your trainer.")')
content = content.replace('                raise ValueError("Could not start session. No Question Sets are available for this module.")', '            raise ValueError("Could not start session. No Question Sets are available for this module.")')

with open('backend/services/viva_service.py', 'w') as f:
    f.write(content)
