from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cc', '0010_match_regentsleague_id'),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="is_trophycase",
            field=models.BooleanField(
                default=False,
                help_text="Whether this event shows on a team trophy case",
            ),
        ),

        migrations.AddField(
            model_name="customevent",
            name="is_trophycase",
            field=models.BooleanField(
                default=False,
                help_text="Whether this event shows on a team trophy case",
            ),
        ),
]

