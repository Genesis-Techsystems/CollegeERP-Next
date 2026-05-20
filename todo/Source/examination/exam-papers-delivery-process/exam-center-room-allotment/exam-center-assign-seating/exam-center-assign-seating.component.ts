import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-exam-center-assign-seating',
  templateUrl: './exam-center-assign-seating.component.html',
  styleUrls: ['./exam-center-assign-seating.component.scss']
})
export class ExamCenterAssignSeatingComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<ExamCenterAssignSeatingComponent>,
    @Inject(MAT_DIALOG_DATA) public data,) { }

  ngOnInit(): void {
  }
  submit(){
    this.dialogRef.close("Yes");
  }
}
