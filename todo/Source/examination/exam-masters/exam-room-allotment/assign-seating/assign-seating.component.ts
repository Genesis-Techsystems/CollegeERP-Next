import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-assign-seating',
  templateUrl: './assign-seating.component.html',
  styleUrls: ['./assign-seating.component.scss']
})
export class AssignSeatingComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<AssignSeatingComponent>,
    @Inject(MAT_DIALOG_DATA) public data,) { }

  ngOnInit(): void {
  }
  submit(){
    this.dialogRef.close("Yes");
  }
}
