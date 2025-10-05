from django.core.management.base import BaseCommand
from enrollment.models import Certificate

class Command(BaseCommand):
    help = 'Backfill serial_hash for certificates where it is empty or null'

    def handle(self, *args, **options):
        qs = Certificate.objects.filter(serial_hash='')
        count = qs.count()
        self.stdout.write(f'Found {count} certificates with empty serial_hash')
        for cert in qs:
            try:
                cert.serial_hash = cert.generate_serial_hash()
                cert.save(update_fields=['serial_hash'])
                self.stdout.write(f'Patched cert id={cert.id} hash={cert.serial_hash}')
            except Exception as e:
                self.stdout.write(f'Failed to patch cert id={cert.id}: {e}')
