import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';

@Component({
  selector: 'app-view-exist-invigilator',
  templateUrl: './view-exist-invigilator.component.html',
  styleUrls: ['./view-exist-invigilator.component.scss']
})

export class ViewExistInvigilatorComponent implements OnInit {

  constructor(
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public data) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {   

  }

  tConvert(time): void{
    time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
      time = time.slice (1);  // Remove full string match value
      time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    time = time[0] + time[1] + time[2] + ' ' + time[5];
    return time; 
  }

}
