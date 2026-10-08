# Curated base keyterms, always sent to Deepgram (live captions and batch
# Enhance/regeneration alike). Terms extracted from the question bank by
# services.keyterm_service are appended per module on top of these.
#
# Only distinctive product/feature nouns belong here: Deepgram biases toward
# every keyterm, so ordinary words ("process", "workflow", "Publish", "Catalog")
# cause words to be inserted that were never said, and the whole list shares
# a ~500-token budget per request.
BASE_DEEPGRAM_KEYTERMS: list[str] = [
    'RPA',
    'ITPA',
    'IT Process Automation',
    'Robotic Process Automation',
    'AutomationEdge',
    'AutomationEdge Server',
    'AutomationEdge Agent',
    'Process Studio',
    'SolFlows',
    'Active MQ',
    'GUI Spy',
    'Switch Case',
    'Filter Rows',
    'Formula step',
    'Rename Field',
    'Calculator step',
    'Start Browser',
    'clear browser instance',
    'locator',
    'XPath',
    'Web GUI automation',
    'singleton',
    'sequential',
    'assisted workflow',
    'unassisted',
    'Awaiting Input',
    'Execution Started',
    'Unload Project',
    'Load Project',
    'Export Project',
    'Import Project',
    'ETL',
    'Extract Transform Load',
    'multi-threading',
    'digital worker',
    'orchestration',
]
